import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { createBadRequestException } from '@wings-online/common';
import { IProductReadRepository } from '@wings-online/product-catalog/interfaces';
import { PRODUCT_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';

import { GetProductIdByExternalIdQuery } from './get-product-id-by-external-id.query';
import { GetProductIdByExternalIdResult } from './get-product-id-by-external-id.result';

@QueryHandler(GetProductIdByExternalIdQuery)
export class GetProductIdByExternalIdHandler
  implements
    IQueryHandler<
      GetProductIdByExternalIdQuery,
      GetProductIdByExternalIdResult
    >
{
  constructor(
    @InjectPinoLogger(GetProductIdByExternalIdHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly productRepository: IProductReadRepository,
  ) {}

  async execute(
    query: GetProductIdByExternalIdQuery,
  ): Promise<GetProductIdByExternalIdResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const productId = await this.productRepository.getProductIdByExternalId(
      query.identity,
      query.externalId,
    );
    if (!productId) throw createBadRequestException('product-not-found');

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
    return new GetProductIdByExternalIdResult(productId);
  }
}
