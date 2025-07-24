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
import {
  CartCheckedOut,
  CartCleared,
  CartItemAdded,
  CartItemQtyChanged,
  CartItemRemoved,
} from '@wings-online/cart/domains/events';
import { CacheUtil } from '@wings-online/common';
import { CacheStore } from '@wings-online/common/redis';

type CartChangedSubscribedEvents =
  | CartItemAdded
  | CartItemQtyChanged
  | CartItemRemoved
  | CartCleared
  | CartCheckedOut;

@EventsHandler(
  CartItemAdded,
  CartItemQtyChanged,
  CartItemRemoved,
  CartCleared,
  CartCheckedOut,
)
export class CartChangedSubscriber
  implements IEventHandler<CartChangedSubscribedEvents>
{
  constructor(
    @InjectPinoLogger(CartChangedSubscriber.name)
    private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(FEATURE_FLAG_SERVICE)
    private readonly featureFlagService: FeatureFlagService,
    @Inject(CACHE_MANAGER)
    protected readonly cacheManager: CacheStore,
  ) {}

  async handle(event: CartChangedSubscribedEvents) {
    this.logger.info({ event });

    const useApiCache = await this.featureFlagService.isEnabled(
      FeatureFlagNameEnum.EnableAPICache,
    );

    if (!useApiCache) {
      return;
    }

    const { externalId } = event.data.identity;
    const wishlistCacheIndexKey = CacheUtil.getCacheKey(
      `user:${externalId}:indexs:wishlists`,
    );
    const listProductsCacheIndexKey = CacheUtil.getCacheKey(
      `user:${externalId}:indexs:products`,
    );
    const keys: string[] = [];
    const indexs: string[] = [wishlistCacheIndexKey, listProductsCacheIndexKey];
    switch (event.name) {
      case 'CartItemAdded':
      case 'CartItemQtyChanged':
      case 'CartItemRemoved': {
        keys.push(
          CacheUtil.getCacheKey(
            `user:${externalId}:url:/v2/sales/products.info?id=${event.data.itemId}`,
          ),
        );
        break;
      }
      case 'CartCleared': {
        const productInfoCacheIndexKey = CacheUtil.getCacheKey(
          `user:${externalId}:indexs:product`,
        );
        indexs.push(productInfoCacheIndexKey);
        break;
      }
      case 'CartCheckedOut': {
        keys.push(
          ...event.data.items.map((item) =>
            CacheUtil.getCacheKey(
              `user:${externalId}:url:/v2/sales/products.info?id=${item.item.id}`,
            ),
          ),
        );
        break;
      }
    }

    try {
      const redisClient = this.cacheManager.getClient();
      const indexMembers = await Promise.all(
        indexs.map((k) => redisClient.smembers(k)),
      );

      const allKeys = unionWith(flatten(indexMembers), indexs, keys);
      await this.cacheManager.del(allKeys);

      this.logger.info(`Cache keys removed`, {
        keys: allKeys,
      });
    } catch (err) {
      this.logger.error(err);
    }
  }
}
