import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IBrandReadRepository } from '@wings-online/product-catalog/interfaces';
import { BRAND_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';

import { ListBrandQuery } from './list-brand.query';
import { ListBrandResult } from './list-brand.result';

@QueryHandler(ListBrandQuery)
export class ListBrandHandler
  implements IQueryHandler<ListBrandQuery, ListBrandResult>
{
  constructor(
    @InjectPinoLogger(ListBrandHandler.name)
    private readonly logger: PinoLogger,
    @Inject(BRAND_READ_REPOSITORY)
    private readonly repository: IBrandReadRepository,
  ) {}

  async execute(query: ListBrandQuery): Promise<ListBrandResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const brands = await this.repository.listBrands({
      ...query,
      useCache: true,
    });

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
    return new ListBrandResult(brands);
  }
}
