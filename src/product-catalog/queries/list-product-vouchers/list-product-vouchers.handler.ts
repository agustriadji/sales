import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IProductReadRepository } from '@wings-online/product-catalog/interfaces';
import { PRODUCT_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';

import { ListProductVouchersQuery } from './list-product-vouchers.query';
import { ListProductVouchersResult } from './list-product-vouchers.result';

@QueryHandler(ListProductVouchersQuery)
export class ListProductVouchersHandler
  implements IQueryHandler<ListProductVouchersQuery, ListProductVouchersResult>
{
  constructor(
    @InjectPinoLogger(ListProductVouchersHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly repository: IProductReadRepository,
  ) {}

  async execute(
    query: ListProductVouchersQuery,
  ): Promise<ListProductVouchersResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const vouchers = await this.repository.listProductVouchers(
      query.identity,
      query.id,
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
    return new ListProductVouchersResult(vouchers);
  }
}
