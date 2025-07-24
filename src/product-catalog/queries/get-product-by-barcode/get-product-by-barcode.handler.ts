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

import { GetProductByBarcodeQuery } from './get-product-by-barcode.query';
import { GetProductByBarcodeResult } from './get-product-by-barcode.result';

@QueryHandler(GetProductByBarcodeQuery)
export class GetProductByBarcodeHandler
  implements IQueryHandler<GetProductByBarcodeQuery, GetProductByBarcodeResult>
{
  constructor(
    @InjectPinoLogger(GetProductByBarcodeHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly repository: IProductReadRepository,
    private readonly eventBus: EventBus,
    @Inject(PRODUCT_CATALOG_SERVICE)
    private readonly service: IProductCatalogService,
  ) {}

  async execute(
    query: GetProductByBarcodeQuery,
  ): Promise<GetProductByBarcodeResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const exist = await this.repository.isProductExistsByBarcode(query.barcode);
    if (!exist) throw createBadRequestException('product-not-found');

    const product = await this.repository.getProductInfoByBarcode(
      query.identity,
      query.barcode,
    );
    if (!product) throw createBadRequestException('product-not-sellable');

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
    return new GetProductByBarcodeResult(product);
  }
}
