import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IProductReadRepository,
  IProductSearchReadRepository,
} from '@wings-online/product-catalog/interfaces';
import {
  PRODUCT_READ_REPOSITORY,
  PRODUCT_SEARCH_READ_REPOSITORY,
} from '@wings-online/product-catalog/product-catalog.constants';

import { SearchProductsQuery } from './search-products.query';
import { SearchProductsResult } from './search-products.result';

@QueryHandler(SearchProductsQuery)
export class SearchProductsHandler
  implements IQueryHandler<SearchProductsQuery, SearchProductsResult>
{
  MAX_SEARCH = 5;
  constructor(
    @InjectPinoLogger(SearchProductsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: IProductSearchReadRepository,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly repository: IProductReadRepository,
  ) {}

  /**
   *
   * @param query
   * @returns
   */
  async execute(query: SearchProductsQuery): Promise<SearchProductsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const searchResult = await this.searchRepository.search({
      search: query.search,
      categoryId: query.categoryId,
    });

    if (searchResult.length === 0) return new SearchProductsResult([]);

    const searchResultId = searchResult.map((product) => product.id);

    const result = await this.repository.listProducts({
      identity: query.identity,
      filter: {
        id: {
          in: searchResultId,
        },
      },
      sort: {
        id: searchResultId,
      },
      page: 1,
      pageSize: query.limit || this.MAX_SEARCH,
      withoutPromoTpr: true,
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
    return new SearchProductsResult(
      result.data.map((data) => {
        return {
          id: data.id,
          name: data.toJSON().name,
          image: data.toJSON().image_url,
          category_id: data.toJSON().category_id,
        };
      }),
    );
  }
}
