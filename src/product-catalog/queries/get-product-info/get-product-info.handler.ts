import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { EventBus, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { EntityId } from '@wings-corporation/domain';
import { createBadRequestException } from '@wings-online/common';
import { ProductViewed } from '@wings-online/product-catalog/domains/events';
import { IProductReadRepository } from '@wings-online/product-catalog/interfaces';
import { IProductCatalogService } from '@wings-online/product-catalog/interfaces/product-catalog.service.interface';
import {
  PRODUCT_CATALOG_SERVICE,
  PRODUCT_READ_REPOSITORY,
} from '@wings-online/product-catalog/product-catalog.constants';

import { GetProductInfoQuery } from './get-product-info.query';
import { GetProductInfoResult } from './get-product-info.result';

@QueryHandler(GetProductInfoQuery)
export class GetProductInfoHandler
  implements IQueryHandler<GetProductInfoQuery, GetProductInfoResult>
{
  constructor(
    @InjectPinoLogger(GetProductInfoHandler.name)
    private readonly logger: PinoLogger,
    private readonly eventBus: EventBus,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly productRepository: IProductReadRepository,
    @Inject(PRODUCT_CATALOG_SERVICE)
    private readonly service: IProductCatalogService,
  ) {}

  async execute(query: GetProductInfoQuery): Promise<GetProductInfoResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const product = await this.productRepository.getProductInfo(
      query.identity,
      query.id,
    );
    if (!product) throw createBadRequestException('product-not-found');

    await this.service.resolvePromotions(query.identity, [product]);
    await this.service.resolveCartQty(query.identity, [product]);

    this.eventBus.publish(
      new ProductViewed({
        identity: query.identity,
        productId: EntityId.fromString(product.id),
      }),
    );

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
    return new GetProductInfoResult(product);
  }
}
