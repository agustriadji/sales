import { uniq } from 'lodash';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IProductViewsReadRepository } from '@wings-online/product-catalog/interfaces';
import { PRODUCT_VIEWS_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';
import {
  FlashSaleStatusEnum,
  IPromoReadRepository,
  PROMO_READ_REPOSITORY,
} from '@wings-online/product-catalog/promotion';

import { ListProductViewsQuery } from './list-product-views.query';
import { ListProductViewsResult } from './list-product-views.result';

@QueryHandler(ListProductViewsQuery)
export class ListProductViewsHandler
  implements IQueryHandler<ListProductViewsQuery, ListProductViewsResult>
{
  constructor(
    @InjectPinoLogger(ListProductViewsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_VIEWS_READ_REPOSITORY)
    private readonly repository: IProductViewsReadRepository,
    @Inject(PROMO_READ_REPOSITORY)
    private readonly promoRepository: IPromoReadRepository,
  ) {}

  async execute(query: ListProductViewsQuery): Promise<ListProductViewsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const views = await this.repository.find(query);

    const flashSales = await this.promoRepository.getFlashSaleItems({
      identity: query.identity,
      itemIds: views.map((view) => view.itemId),
      status: FlashSaleStatusEnum.ACTIVE,
    });
    const tags = uniq(views.map((view) => view.tags).flat());
    const regularPromos =
      await this.promoRepository.listProductsRegularPromotions(
        query.identity,
        views.map((view) => view.itemId),
        tags,
      );

    for (const view of views) {
      const flashSale = flashSales.find(
        (f) =>
          (f.target.type === 'TAG' && view.tags.includes(f.target.value)) ||
          (f.target.type === 'ITEM' && f.target.value === view.itemId),
      );
      if (flashSale) {
        view.setPromoExternalId(flashSale.externalId);
        continue;
      }

      const regular = regularPromos.find(
        (promotion) =>
          promotion.target.itemId === view.itemId ||
          view.tags.includes(promotion.target.tag.toString()),
      );
      if (regular) {
        view.setPromoExternalId(regular.externalId);
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
    return new ListProductViewsResult(views);
  }
}
