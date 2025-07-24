import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { createBadRequestException } from '@wings-online/common';
import { IProductCatalogService } from '@wings-online/product-catalog/interfaces/product-catalog.service.interface';
import { PRODUCT_CATALOG_SERVICE } from '@wings-online/product-catalog/product-catalog.constants';
import { PROMOTION_SERVICE } from '@wings-online/product-catalog/promotion';
import { IPromotionService } from '@wings-online/product-catalog/promotion/interfaces/promotion.service.interface';
import { ProductReadModel } from '@wings-online/product-catalog/read-models';

import { ListProductPromotionsQuery } from './list-product-promotions.query';
import { ListProductPromotionsResult } from './list-product-promotions.result';

@QueryHandler(ListProductPromotionsQuery)
export class ListProductPromotionsHandler
  implements
    IQueryHandler<ListProductPromotionsQuery, ListProductPromotionsResult>
{
  constructor(
    @InjectPinoLogger(ListProductPromotionsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_CATALOG_SERVICE)
    private readonly service: IProductCatalogService,
    @Inject(PROMOTION_SERVICE)
    private readonly promotionService: IPromotionService,
  ) {}

  async execute(
    query: ListProductPromotionsQuery,
  ): Promise<ListProductPromotionsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const product: ProductReadModel | undefined =
      await this.service.getProductInfo(query.identity, query.id);

    if (!product) throw createBadRequestException('product-not-found');

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
    return new ListProductPromotionsResult(product.promotion);
  }
}
