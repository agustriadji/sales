import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ICategoryReadRepository } from '@wings-online/product-catalog/interfaces';
import { CATEGORY_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';

import { ListCategoryQuery } from './list-category.query';
import { ListCategoryResult } from './list-category.result';

@QueryHandler(ListCategoryQuery)
export class ListCategoryHandler
  implements IQueryHandler<ListCategoryQuery, ListCategoryResult>
{
  constructor(
    @InjectPinoLogger(ListCategoryHandler.name)
    private readonly logger: PinoLogger,
    @Inject(CATEGORY_READ_REPOSITORY)
    private readonly repository: ICategoryReadRepository,
  ) {}

  async execute(query: ListCategoryQuery): Promise<ListCategoryResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const categories = await this.repository.listCategories({ ...query });

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
    return new ListCategoryResult(categories);
  }
}
