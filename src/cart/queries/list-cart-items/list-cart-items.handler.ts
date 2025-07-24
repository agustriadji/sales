import { union } from 'lodash';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EntityId } from '@wings-corporation/domain';
import { CART_READ_REPOSITORY } from '@wings-online/app.constants';
import { ICartReadRepository } from '@wings-online/cart/interfaces';
import {
  IPromoReadRepository,
  PROMO_READ_REPOSITORY,
  TprPromo,
} from '@wings-online/cart/promotion';
import { CartQtyReadModel } from '@wings-online/cart/read-models/cart-qty.read-model';
import { CartUtils } from '@wings-online/cart/utils/cart.utils';
import {
  MinimumPurchaseQtyByTagCriterion,
  PurchaseQtyBetweenByTagCriterion,
  UserIdentity,
} from '@wings-online/common';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { ListCartItemsQuery } from './list-cart-items.query';
import { ListCartItemsResult } from './list-cart-items.result';

@QueryHandler(ListCartItemsQuery)
export class ListCartItemsHandler
  implements IQueryHandler<ListCartItemsQuery, ListCartItemsResult>
{
  constructor(
    @InjectPinoLogger(ListCartItemsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(CART_READ_REPOSITORY)
    private readonly repository: ICartReadRepository,
    @Inject(PROMO_READ_REPOSITORY)
    private readonly promoRepository: IPromoReadRepository,
    private readonly parameterService: ParameterService,
  ) {}

  async execute(query: ListCartItemsQuery): Promise<ListCartItemsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const collection = await this.repository.getCartItems({
      ...query,
      limit: query.limit,
    });

    const itemIds = collection.data.map((x) => x.item.id);
    const collectionTags = collection.data.reduce((acc, item) => {
      item.item.tags.forEach((tag) => {
        if (!acc.includes(tag)) {
          acc.push(tag);
        }
      });
      return acc;
    }, new Array<string>());

    const [itemFlashSale, itemRegularPromotions, itemTprPromotions] =
      await Promise.all([
        this.promoRepository.getItemFlashSale(query.identity, itemIds),
        this.promoRepository.getItemRegularPromotions(
          query.identity,
          itemIds,
          collectionTags,
        ),
        this.promoRepository.getItemTPRPromotions(
          query.identity,
          collection.data.map((x) => ({
            id: x.item.id,
            baseQty: x.item.baseQty,
            packQty: x.item.packQty,
            tags: x.item.tags,
          })),
        ),
      ]);

    const includedItemsCartQty = await this.getIncludedItemsQtyInCart(
      query.identity,
      itemTprPromotions,
    );

    const tprPromoTags = itemTprPromotions.flatMap((promo) =>
      promo.tag
        ? [promo.tag.toString()].concat(
            promo.tagCriteria?.includedTag?.toString() || [],
          )
        : [],
    );

    const cartTag = await this.repository.getCartTagsByTags(
      query.identity,
      union(collection.data.map((x) => x.item.tags).flat(), tprPromoTags),
    );

    const itemFlashSaleMap = CartUtils.mapFlashSaleByItemId(
      itemFlashSale,
      collection.data,
    );

    const lifetimePromoExternalType = this.parameterService.getOne(
      ParameterKeys.LIFETIME_PROMOTION_EXTERNAL_TYPE,
    );

    for (const cartItem of collection.data) {
      // apply purchase tag
      for (const tag of cartTag) {
        if (cartItem.item.tags.some((t) => t === tag.tag.toString())) {
          cartItem.cartQty.addQtyByTag(tag);
        }
      }

      // apply flash sale
      const flashSale = itemFlashSaleMap.get(cartItem.item.id);
      if (flashSale) {
        cartItem.applyPromotion(flashSale);
      }

      // apply tpr promotions
      const tprPromotions = itemTprPromotions.filter(
        (promo) =>
          cartItem.item.tags.some((tag) => promo.tag?.toString() === tag) ||
          (promo.itemId !== '*' &&
            promo.itemId.equals(EntityId.fromString(cartItem.item.id))),
      );

      for (const tprPromo of tprPromotions) {
        if (lifetimePromoExternalType?.value === tprPromo.externalType) {
          cartItem.applyLifetimePromotion(tprPromo);
        } else {
          cartItem.applyPromotion(tprPromo);
        }

        (tprPromo.tagCriteria?.items || []).forEach((item) => {
          cartItem.cartQty.addQtyByItem({
            itemId: item.id,
            ...includedItemsCartQty.byItem(item.id),
          });
        });

        if (tprPromo.tag) {
          const tag = cartTag.find((tag) => tag.tag.equals(tprPromo.tag));
          tag && cartItem.cartQty.addQtyByTag(tag);

          const includedTag = tprPromo.tagCriteria?.includedTag;
          if (includedTag) {
            const includedCartTag = cartTag.find((tag) =>
              tag.tag.equals(includedTag),
            );
            includedCartTag && cartItem.cartQty.addQtyByTag(includedCartTag);
          }
        }
      }

      // apply regular promotion
      const regularPromotions = itemRegularPromotions.filter(
        (promo) =>
          (promo.itemId !== '*' &&
            promo.itemId.equals(EntityId.fromString(cartItem.item.id))) ||
          cartItem.item.tags.some((tag) => promo.tag?.toString() === tag),
      );
      if (regularPromotions.length > 0) {
        for (const regularPromotion of regularPromotions) {
          cartItem.applyPromotion(regularPromotion);
        }
      }
    }

    // Log memory usage in megabytes and bytes
    const memoryUsage = process.memoryUsage();
    this.logger.info(
      {
        memoryUsage: {
          rss: {
            bytes: memoryUsage.rss,
            megabytes: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
          },
          heapTotal: {
            bytes: memoryUsage.heapTotal,
            megabytes: (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
          },
          heapUsed: {
            bytes: memoryUsage.heapUsed,
            megabytes: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
          },
          external: {
            bytes: memoryUsage.external,
            megabytes: (memoryUsage.external / (1024 * 1024)).toFixed(2),
          },
          arrayBuffers: {
            bytes: memoryUsage.arrayBuffers,
            megabytes: (memoryUsage.arrayBuffers / (1024 * 1024)).toFixed(2),
          },
        },
      },
      'After Memory Usage',
    );
    this.logger.trace(`END`);

    return new ListCartItemsResult(collection);
  }

  private async getIncludedItemsQtyInCart(
    identity: UserIdentity,
    promotions: TprPromo[],
  ): Promise<CartQtyReadModel> {
    const itemIds = promotions.flatMap(({ condition }) => {
      const criterion = condition.criteria[0]?.criterion;

      if (
        criterion instanceof MinimumPurchaseQtyByTagCriterion ||
        criterion instanceof PurchaseQtyBetweenByTagCriterion
      ) {
        return criterion.tagCriteria?.items.map((item) => item.id) || [];
      }

      return [];
    });

    return await this.repository.getCartQtyByItems(identity, itemIds);
  }
}
