import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IFilterReadRepository,
  IProductSearchReadRepository,
} from '@wings-online/product-catalog/interfaces';
import {
  FILTER_READ_REPOSITORY,
  PRODUCT_SEARCH_READ_REPOSITORY,
} from '@wings-online/product-catalog/product-catalog.constants';
import { FilterState } from '@wings-online/product-catalog/read-models';

import { GetProductFilterQuery } from './get-product-filter.query';
import { GetProductFilterResult } from './get-product-filter.result';

@QueryHandler(GetProductFilterQuery)
export class GetProductFilterHandler
  implements IQueryHandler<GetProductFilterQuery, GetProductFilterResult>
{
  constructor(
    @InjectPinoLogger(GetProductFilterHandler.name)
    private readonly logger: PinoLogger,
    @Inject(FILTER_READ_REPOSITORY)
    private readonly repository: IFilterReadRepository,
    @Inject(PRODUCT_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: IProductSearchReadRepository,
  ) {}

  async execute(query: GetProductFilterQuery): Promise<GetProductFilterResult> {
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
        return new GetProductFilterResult(new FilterState());
      }
    }

    const state = await this.repository.getFilterState(query.identity, {
      categoryId: query.categoryId,
      isNew: query.isNew,
      isBestSeller: query.isBestSeller,
      isLowStock: query.isLowStock,
      isSelected: query.isSelected,
      isFrequentlyPurchased: query.isFrequentlyPurchased,
      isSimilar: query.isSimilar,
      itemIds: query.search ? searchItemIds : undefined,
      isTprPromo: query.isTprPromo,
      isActiveFlashSale: query.isActiveFlashSale,
      isUpcomingFlashSale: query.isUpcomingFlashSale,
    });

    for (const condition of query.conditions || []) {
      state.addCondition(condition);
    }

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
    return new GetProductFilterResult(state);
  }
}
