import { flatten, unionWith } from 'lodash';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  FEATURE_FLAG_SERVICE,
  FeatureFlagService,
} from '@wings-corporation/nest-feature-flag';
import { FeatureFlagNameEnum } from '@wings-online/app.constants';
import { CacheUtil } from '@wings-online/common';
import { CacheStore } from '@wings-online/common/redis';
import {
  WishlistAdded,
  WishlistItemAdded,
  WishlistItemRemoved,
  WishlistRemoved,
  WishlistRenamed,
} from '@wings-online/wishlist/domains/events';

type WishlistChangedSubscribedEvents =
  | WishlistItemAdded
  | WishlistItemRemoved
  | WishlistAdded
  | WishlistRemoved
  | WishlistRenamed;

@EventsHandler(
  WishlistItemAdded,
  WishlistItemRemoved,
  WishlistAdded,
  WishlistRemoved,
  WishlistRenamed,
)
export class WishlistChangedSubscriber
  implements IEventHandler<WishlistChangedSubscribedEvents>
{
  constructor(
    @InjectPinoLogger(WishlistChangedSubscriber.name)
    private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(FEATURE_FLAG_SERVICE)
    private readonly featureFlagService: FeatureFlagService,
    @Inject(CACHE_MANAGER)
    protected readonly cacheManager: CacheStore,
  ) {}

  async handle(event: WishlistChangedSubscribedEvents) {
    this.logger.info({ event });

    const { externalId } = event.data.identity;

    const useApiCache = await this.featureFlagService.isEnabled(
      FeatureFlagNameEnum.EnableAPICache,
    );

    const wishlistCacheKey = CacheUtil.getCacheKey(
      `user:${externalId}:wishlists:*`,
    );
    const listProductsCacheKey = CacheUtil.getCacheKey(
      `user:${externalId}:products:*`,
    );
    const listProductsCacheIndexKey = CacheUtil.getCacheKey(
      `user:${externalId}:indexs:products`,
    );
    const wishlistCacheIndexKey = CacheUtil.getCacheKey(
      `user:${externalId}:indexs:wishlists`,
    );

    const keys: string[] = [];
    const indexs: string[] = [];
    switch (event.name) {
      case 'WishlistAdded':
      case 'WishlistRenamed': {
        if (useApiCache) {
          const indexMembers = await this.cacheManager
            .getClient()
            .smembers(wishlistCacheIndexKey);
          keys.push(...indexMembers.filter((x) => x.includes('wishlist.list')));
        } else {
          keys.push(wishlistCacheKey);
        }
        break;
      }
      case 'WishlistRemoved': {
        if (useApiCache) {
          indexs.push(wishlistCacheIndexKey, listProductsCacheIndexKey);
          keys.push(
            ...event.data.itemIds.map((x) =>
              CacheUtil.getCacheKey(
                `user:${externalId}:url:/v2/sales/products.info?id=${x}`,
              ),
            ),
          );
        } else {
          keys.push(
            wishlistCacheKey,
            listProductsCacheKey,
            ...event.data.itemIds.map((x) =>
              CacheUtil.getCacheKey(`user:${externalId}:product:${x}`),
            ),
          );
        }

        break;
      }
      case 'WishlistItemAdded':
      case 'WishlistItemRemoved': {
        if (useApiCache) {
          indexs.push(wishlistCacheIndexKey, listProductsCacheIndexKey);
          keys.push(
            CacheUtil.getCacheKey(
              `user:${externalId}:url:/v2/sales/products.info?id=${event.data.itemId}`,
            ),
          );
        } else {
          keys.push(
            wishlistCacheKey,
            listProductsCacheKey,
            CacheUtil.getCacheKey(
              `user:${externalId}:product:${event.data.itemId}`,
            ),
          );
        }
        break;
      }
    }

    try {
      if (useApiCache) {
        const redisClient = this.cacheManager.getClient();
        const indexMembers = await Promise.all(
          indexs.map((k) => redisClient.smembers(k)),
        );

        const allKeys = unionWith(flatten(indexMembers), indexs, keys);
        if (allKeys.length) {
          await this.cacheManager.del(allKeys);
        }
        this.logger.info(`Cache keys removed`, {
          keys: allKeys,
        });
      } else {
        await this.dataSource.queryResultCache?.remove(keys);
        this.logger.info(`Cache keys removed`, {
          keys,
        });
      }
    } catch (err) {
      this.logger.error(err);
    }
  }
}
