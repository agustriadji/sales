import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ICategoryParentReadRepository } from '@wings-online/product-catalog/interfaces';
import { CATEGORY_PARENT_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';

import { ListCategoryParentQuery } from './list-category-parent.query';
import { ListCategoryParentResult } from './list-category-parent.result';

@QueryHandler(ListCategoryParentQuery)
export class ListCategoryParentHandler
  implements IQueryHandler<ListCategoryParentQuery, ListCategoryParentResult>
{
  constructor(
    @InjectPinoLogger(ListCategoryParentHandler.name)
    private readonly logger: PinoLogger,
    @Inject(CATEGORY_PARENT_READ_REPOSITORY)
    private readonly repository: ICategoryParentReadRepository,
  ) {}

  async execute(
    query: ListCategoryParentQuery,
  ): Promise<ListCategoryParentResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const categoryParents = await this.repository.listCategoryParents(
      query.identity,
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
    return new ListCategoryParentResult(categoryParents);
  }
}
