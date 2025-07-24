import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  FilterCondition,
  createBadRequestException,
} from '@wings-online/common';
import {
  IProductReadRepository,
  IProductSearchReadRepository,
} from '@wings-online/product-catalog/interfaces';
import { IProductCatalogService } from '@wings-online/product-catalog/interfaces/product-catalog.service.interface';
import {
  PRODUCT_CATALOG_SERVICE,
  PRODUCT_READ_REPOSITORY,
  PRODUCT_SEARCH_READ_REPOSITORY,
} from '@wings-online/product-catalog/product-catalog.constants';
import { ProductSearchReadModel } from '@wings-online/product-catalog/read-models';

import { ListTPRProductsQuery } from './list-tpr-products.query';
import { ListTPRProductsResult } from './list-tpr-products.result';

@QueryHandler(ListTPRProductsQuery)
export class ListTPRProductsHandler
  implements IQueryHandler<ListTPRProductsQuery, ListTPRProductsResult>
{
  MAX_SEARCH = 1000;

  constructor(
    @InjectPinoLogger(ListTPRProductsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly repository: IProductReadRepository,
    @Inject(PRODUCT_SEARCH_READ_REPOSITORY)
    private readonly searchRepository: IProductSearchReadRepository,
    @Inject(PRODUCT_CATALOG_SERVICE)
    private readonly service: IProductCatalogService,
  ) {}

  async execute(query: ListTPRProductsQuery): Promise<ListTPRProductsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    let filterId: FilterCondition<string> | undefined;
    let searchResultId: string[] | undefined;

    if (query.search) {
      const searchResult: ProductSearchReadModel[] =
        await this.searchRepository.search({
          search: query.search,
          limit: this.MAX_SEARCH,
        });

      if (searchResult.length === 0) {
        throw createBadRequestException('product-search-empty');
      }
      searchResultId = searchResult.map((product) => product.id);

      filterId = {
        in: searchResultId,
      };
    }

    const collection = await this.repository.listTPRProducts({
      ...query,
      filter: { ...query.filter, id: filterId },
      sort: {
        ...query.sort,
        id: searchResultId,
      },
    });

    await this.service.resolvePromotions(query.identity, collection.data);
    await this.service.resolveCartQty(query.identity, collection.data);

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

    return new ListTPRProductsResult(collection);
  }
}
