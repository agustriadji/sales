import { InjectOpensearchClient, OpensearchClient } from 'nestjs-opensearch';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpensearchResult } from '@wings-online/common';

import { OpensearchItemEntity } from '../entities';
import { IProductSearchReadRepository } from '../interfaces';
import { ProductSearchReadModel } from '../read-models';
import { OpensearchReadRepository } from './opensearch.read-repository';

@Injectable()
export class OpensearchProductSearchReadRepository
  extends OpensearchReadRepository
  implements IProductSearchReadRepository
{
  searchLimit: number;
  constructor(
    @InjectOpensearchClient()
    readonly searchClient: OpensearchClient,
    @InjectPinoLogger(OpensearchProductSearchReadRepository.name)
    readonly logger: PinoLogger,
    readonly config: ConfigService,
    @Inject(CACHE_MANAGER)
    readonly cacheManager: Cache,
  ) {
    const indexName = 'products';
    super(searchClient, logger, indexName, cacheManager);
    this.searchLimit = this.config.getOrThrow('OPENSEARCH_SEARCH_LIMIT');
  }

  /**
   *
   * @param search
   * @param limit
   * @returns
   */
  async search(params: {
    search: string;
    categoryId?: number;
    limit?: number;
  }): Promise<ProductSearchReadModel[]> {
    const method = 'search';
    this.logger.trace(`BEGIN`);
    this.logger.info({ method, params });

    const search = params.search.toLowerCase();
    const limit = params.limit || this.searchLimit;
    const searchKey = `${search}:${params.categoryId || 'ALL'}:${limit}`;

    const cacheResult = await this.getSearchCacheResult<
      ProductSearchReadModel[]
    >(searchKey);
    if (cacheResult) {
      this.logger.debug({ method, cacheResult });
      this.logger.trace({ method }, 'end');
      return cacheResult;
    }

    const body = {
      query: {
        bool: {
          should: [
            {
              match: {
                name: {
                  query: search,
                  boost: 3,
                },
              },
            },
            {
              term: {
                external_id: {
                  value: params.search,
                  boost: 10,
                },
              },
            },
            {
              prefix: {
                name: {
                  value: search,
                  boost: 5,
                },
              },
            },
            {
              fuzzy: {
                name: {
                  value: search,
                },
              },
            },
            {
              match: {
                'name_nowhitespace.partial': {
                  query: search,
                },
              },
            },
          ],
          must: params.categoryId
            ? [
                {
                  term: {
                    category_id: {
                      value: params.categoryId,
                    },
                  },
                },
              ]
            : undefined,
          minimum_should_match: 1,
        },
      },
      size: limit,
    };

    this.logger.debug({ method, body });

    const response = await this.searchClient.search<
      OpensearchResult<OpensearchItemEntity>
    >({
      index: this.indexName,
      body,
    });
    this.logger.debug({ method, response: response.body });

    const result = response.body.hits.hits.map((item) => {
      return {
        id: item._source.id,
        name: item._source.name,
      };
    });
    await this.setSearchCacheResult(searchKey, result);

    this.logger.trace({ method }, 'END');
    return result;
  }
}
