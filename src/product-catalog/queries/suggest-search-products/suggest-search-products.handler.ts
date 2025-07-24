import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IProductSearchReadRepository } from '@wings-online/product-catalog/interfaces';
import { PRODUCT_SEARCH_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';

import { SuggestSearchProductsQuery } from './suggest-search-products.query';
import { SuggestSearchProductsResult } from './suggest-search-products.result';

@QueryHandler(SuggestSearchProductsQuery)
export class SuggestSearchProductsHandler
  implements
    IQueryHandler<SuggestSearchProductsQuery, SuggestSearchProductsResult>
{
  constructor(
    @InjectPinoLogger(SuggestSearchProductsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: IProductSearchReadRepository,
  ) {}

  /**
   *
   * @param query
   * @returns
   */
  async execute(
    query: SuggestSearchProductsQuery,
  ): Promise<SuggestSearchProductsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const suggestedSearch = await this.searchRepository.spellCheck(
      query.search,
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
    return new SuggestSearchProductsResult({
      is_same: query.search === suggestedSearch,
      old_search: query.search,
      suggested_search: suggestedSearch,
    });
  }
}
