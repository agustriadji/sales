import { Cluster, Redis } from 'ioredis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Observable, of, tap } from 'rxjs';
import { DataSource } from 'typeorm';

import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { Organization } from '@wings-corporation/core';
import {
  FEATURE_FLAG_SERVICE,
  FeatureFlagService,
} from '@wings-corporation/nest-feature-flag';
import {
  FeatureFlagNameEnum,
  SHORT_DEFAULT_TTL_SECONDS,
} from '@wings-online/app.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { TypeOrmFlashsaleEntity } from '../entities';
import { CacheStore } from '../redis';
import { CacheUtil } from '../utils';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  private readonly redisClient: Redis | Cluster;

  constructor(
    @InjectPinoLogger(HttpCacheInterceptor.name)
    private readonly logger: PinoLogger,
    @Inject(FEATURE_FLAG_SERVICE)
    private readonly featureFlagService: FeatureFlagService,
    @Inject(CACHE_MANAGER)
    protected readonly cacheManager: CacheStore,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly parameterService: ParameterService,
    protected readonly reflector: Reflector,
  ) {
    super(cacheManager, reflector);

    this.redisClient = this.cacheManager.getClient();
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const isApiCacheEnabled = await this.featureFlagService.isEnabled(
      FeatureFlagNameEnum.EnableAPICache,
    );

    if (isApiCacheEnabled) {
      const cacheKey = this.trackBy(context);
      if (!cacheKey) {
        return next.handle();
      }

      const cachedValue = await this.cacheManager.get(cacheKey);
      if (cachedValue) {
        return of(cachedValue);
      }

      const ttl = await this.calculateProductsCacheTTL(
        request.identity.organization,
      );

      return next.handle().pipe(
        tap(async (data) => {
          try {
            await this.cacheManager.set(cacheKey, data, ttl);
            await this.addToIndex(request.identity.externalId, cacheKey, ttl);
          } catch (error) {
            this.logger.error('Cache storage error:', error);
          }
        }),
      );
    }

    return next.handle();
  }

  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();

    if (request.url.includes('/products.id.by-external-id')) {
      return CacheUtil.getCacheKey(
        `organization:${request.identity.organization}:url:${request.url}`,
      );
    }

    return CacheUtil.getCacheKey(
      `user:${request.identity.externalId}:url:${request.url}`,
    );
  }

  private async addToIndex(userId: string, key: string, ttl: number) {
    let index: string | undefined;
    if (key.match(/products(.*)list/)) {
      // product list
      index = CacheUtil.getCacheKey(`user:${userId}:indexs:products`);
    } else if (key.match(/products\.info(.*)id=(.*)/)) {
      // product info
      index = CacheUtil.getCacheKey(`user:${userId}:indexs:product`);
    } else if (key.match(/wishlist(.*)list/)) {
      index = CacheUtil.getCacheKey(`user:${userId}:indexs:wishlists`);
    }

    if (index) {
      const pipeline = this.redisClient.pipeline();
      pipeline.sadd(index, key);
      pipeline.expire(index, ttl);
      await pipeline.exec();
    }
  }

  private async calculateProductsCacheTTL(
    organization: Organization,
  ): Promise<number> {
    const flashsaleEventTime = await this.getNearestFlashSaleEventTime(
      organization,
    );

    if (!flashsaleEventTime) {
      return CacheUtil.getDefaultTTLSeconds();
    }

    const diffNow = Math.floor(
      (flashsaleEventTime.getTime() - Date.now()) / 1000,
    );

    return diffNow > 0
      ? Math.min(diffNow, CacheUtil.getDefaultTTLSeconds())
      : SHORT_DEFAULT_TTL_SECONDS;
  }

  /**
   * Gets the nearest flash sale event time
   */
  private async getNearestFlashSaleEventTime(
    organization: Organization,
  ): Promise<Date | undefined> {
    // fetch nearest flashsale event time cache
    const cacheKey = CacheUtil.getCacheKey(
      `organization:${organization}:nearest-flashsale-event-time`,
    );

    const cachedTimestamp = await this.cacheManager.get<number | null>(
      cacheKey,
    );

    if (cachedTimestamp !== undefined) {
      return cachedTimestamp ? new Date(cachedTimestamp) : undefined;
    }

    // on cache miss, fetch from the DB.
    const eventTime = await this._fetchNearestFlashsaleEventTime(organization);

    const valueToCache = eventTime ? eventTime.getTime() : null;

    // cache db result
    if (eventTime) {
      const ttl = Math.floor((eventTime.getTime() - Date.now()) / 1000);
      if (ttl > 0) {
        await this.cacheManager.set(
          cacheKey,
          valueToCache,
          Math.min(ttl, CacheUtil.getDefaultTTLSeconds()),
        );
      }
    } else {
      await this.cacheManager.set(
        cacheKey,
        valueToCache,
        CacheUtil.getDefaultTTLSeconds(),
      );
    }

    return eventTime;
  }

  /**
   * Fetches the nearest flash sale event (active end, display start, or upcoming start) from the database.
   */
  private async _fetchNearestFlashsaleEventTime(
    organization: Organization,
  ): Promise<Date | undefined> {
    const now = new Date();
    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmFlashsaleEntity, 'promo')
      .andWhere('promo.organization IN (:...orgIds)', {
        orgIds: ['*', organization],
      })
      .andWhere(`promo.type = 'FLS'`);

    const activeFlashsale = await queryBuilder
      .clone()
      .andWhere('promo.periodFrom <= :now', { now })
      .andWhere('promo.periodTo >= :now', { now })
      .orderBy('promo.periodTo', 'ASC')
      .getOne();

    if (activeFlashsale) {
      return activeFlashsale.periodTo;
    }

    const upcomingSale = await queryBuilder
      .clone()
      .andWhere('promo.periodFrom > :now', { now })
      .orderBy('promo.periodFrom', 'ASC')
      .getOne();

    if (upcomingSale) {
      const displayHoursParam = this.parameterService.getOne(
        'upcoming_display_in_hour',
      );

      // if there's no display window parameter, the only event is the flashsale's actual start time.
      if (!displayHoursParam?.value) {
        return upcomingSale.periodFrom;
      }

      const displayWindowMs = Number(displayHoursParam.value) * 60 * 60 * 1000;
      const displayStartTime = new Date(
        upcomingSale.periodFrom.getTime() - displayWindowMs,
      );

      // determine which upcoming event is closer: the display start or the flashsale start.
      if (now.getTime() < displayStartTime.getTime()) {
        return displayStartTime;
      } else {
        return upcomingSale.periodFrom;
      }
    }

    // no active or upcoming sales found.
    return undefined;
  }
}
