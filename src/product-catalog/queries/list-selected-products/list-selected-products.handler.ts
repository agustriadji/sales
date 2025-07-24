import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IProductReadRepository } from '@wings-online/product-catalog/interfaces';
import { IProductCatalogService } from '@wings-online/product-catalog/interfaces/product-catalog.service.interface';
import {
  PRODUCT_CATALOG_SERVICE,
  PRODUCT_READ_REPOSITORY,
} from '@wings-online/product-catalog/product-catalog.constants';

import { ListSelectedProductsQuery } from './list-selected-products.query';
import { ListSelectedProductsResult } from './list-selected-products.result';

@QueryHandler(ListSelectedProductsQuery)
export class ListSelectedProductsHandler
  implements
    IQueryHandler<ListSelectedProductsQuery, ListSelectedProductsResult>
{
  constructor(
    @InjectPinoLogger(ListSelectedProductsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly repository: IProductReadRepository,
    @Inject(PRODUCT_CATALOG_SERVICE)
    private readonly service: IProductCatalogService,
  ) {}

  async execute(
    query: ListSelectedProductsQuery,
  ): Promise<ListSelectedProductsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const collection = await this.repository.getSelectedProducts(query);

    await this.service.resolvePromotions(query.identity, collection.data);
    await this.service.resolveCartQty(query.identity, collection.data);

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

    return new ListSelectedProductsResult(collection);
  }
}
