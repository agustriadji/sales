import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Money } from '@wings-corporation/domain';
import {
  IFilterReadRepository,
  IProductSearchReadRepository,
} from '@wings-online/product-catalog/interfaces';
import {
  FILTER_READ_REPOSITORY,
  PRODUCT_SEARCH_READ_REPOSITORY,
} from '@wings-online/product-catalog/product-catalog.constants';
import { FilterReadModel } from '@wings-online/product-catalog/read-models';

import { GetFilterQuery } from './get-filter.query';
import { GetFilterResult } from './get-filter.result';

@QueryHandler(GetFilterQuery)
export class GetFilterHandler
  implements IQueryHandler<GetFilterQuery, GetFilterResult>
{
  constructor(
    @InjectPinoLogger(GetFilterHandler.name)
    private readonly logger: PinoLogger,
    @Inject(FILTER_READ_REPOSITORY)
    private readonly repository: IFilterReadRepository,
    @Inject(PRODUCT_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: IProductSearchReadRepository,
  ) {}

  async execute(query: GetFilterQuery): Promise<GetFilterResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    let searchItemIds: string[] = [];
    if (query.search) {
      const searchResult = await this.searchRepository.search({
        search: query.search,
        categoryId: query.categoryId,
      });
      searchItemIds = searchResult.map((product) => product.id);

      if (searchItemIds.length === 0) {
        this.logger.trace(`END`);
        return new GetFilterResult(FilterReadModel.empty());
      }
    }

    const filter = await this.repository.getFilter({
      identity: query.identity,
      categoryId: query.categoryId,
      brandId: query.brandId,
      priceRange: query.hetRange.map((range) => ({
        from: Money.create(range.from),
        to: range.to ? Money.create(range.to) : undefined,
      })),
      variant: query.variant,
      packSize: query.packSize,
      recommendation: query.recommendation,
      isBestSeller: query.isBestSeller,
      isLowStock: query.isLowStock,
      isNew: query.isNew,
      itemIds: query.search ? searchItemIds : undefined,
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
    return new GetFilterResult(filter);
  }
}
