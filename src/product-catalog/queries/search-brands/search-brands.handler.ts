import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IBrandReadRepository,
  IBrandSearchReadRepository,
} from '@wings-online/product-catalog/interfaces';
import {
  BRAND_READ_REPOSITORY,
  BRAND_SEARCH_READ_REPOSITORY,
} from '@wings-online/product-catalog/product-catalog.constants';

import { SearchBrandsQuery } from './search-brands.query';
import { SearchBrandsResult } from './search-brands.result';

@QueryHandler(SearchBrandsQuery)
export class SearchBrandsHandler
  implements IQueryHandler<SearchBrandsQuery, SearchBrandsResult>
{
  MAX_SEARCH = 3;
  constructor(
    @InjectPinoLogger(SearchBrandsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(BRAND_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: IBrandSearchReadRepository,
    @Inject(BRAND_READ_REPOSITORY)
    private readonly repository: IBrandReadRepository,
  ) {}

  /**
   *
   * @param query
   * @returns
   */
  async execute(query: SearchBrandsQuery): Promise<SearchBrandsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const searchResult = await this.searchRepository.search({
      search: query.search,
      organization: query.identity.organization,
      type: query.type,
    });

    if (searchResult.length === 0) return new SearchBrandsResult([]);

    const brands = await this.repository.listBrands({
      identity: query.identity,
      ids: searchResult.map((brand) => brand.id),
      limit: query.limit || this.MAX_SEARCH,
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
    return new SearchBrandsResult(
      brands.map((brand) => {
        return {
          ...brand,
          id: brand.id.toString(),
        };
      }),
    );
  }
}
