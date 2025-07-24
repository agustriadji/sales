import { InjectOpensearchClient, OpensearchClient } from 'nestjs-opensearch';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationEnum } from '@wings-corporation/core';
import { OpensearchResult } from '@wings-online/common';

import { OpensearchBrandEntity } from '../entities';
import { IBrandSearchReadRepository, SearchBrandParams } from '../interfaces';
import { BrandSearchReadModel } from '../read-models';
import { OpensearchReadRepository } from './opensearch.read-repository';

@Injectable()
export class OpensearchBrandSearchReadRepository
  extends OpensearchReadRepository
  implements IBrandSearchReadRepository
{
  searchLimit: number;
  constructor(
    @InjectOpensearchClient()
    readonly searchClient: OpensearchClient,
    @InjectPinoLogger(OpensearchBrandSearchReadRepository.name)
    readonly logger: PinoLogger,
    readonly config: ConfigService,
    @Inject(CACHE_MANAGER)
    readonly cacheManager: Cache,
  ) {
    const indexName = 'brands';
    super(searchClient, logger, indexName, cacheManager);
    this.searchLimit = this.config.getOrThrow('OPENSEARCH_SEARCH_LIMIT');
  }
  /**
   *
   * @param search
   */
  async search(params: SearchBrandParams): Promise<BrandSearchReadModel[]> {
    const method = 'search';
    this.logger.trace(`BEGIN`);
    this.logger.info({ method, params });

    const search = params.search.toLowerCase();
    const limit = params.limit || this.searchLimit;
    const searchKey = `${search}:${params.organization}:${
      params.type || 'ALL'
    }:${params.categoryId || 'ALL'}:${limit}`;

    const cacheResult = await this.getSearchCacheResult<BrandSearchReadModel[]>(
      searchKey,
    );
    if (cacheResult) {
      this.logger.debug({ method, cacheResult });
      this.logger.trace({ method }, 'end');
      return cacheResult;
    }

    const mustQuery: Record<string, any>[] = [];
    mustQuery.push({
      term: {
        flag_ws: {
          value: params.organization === OrganizationEnum.WS ? true : false,
        },
      },
    });

    if (params.type) {
      mustQuery.push({
        term: {
          category_type: {
            value: params.type.toLowerCase(),
          },
        },
      });
    }

    const body = {
      query: {
        bool: {
          should: [
            {
              match: {
                name: {
                  query: search,
                  boost: 3.0,
                },
              },
            },
            {
              prefix: {
                name: {
                  value: search,
                  boost: 5.0,
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
          must: mustQuery,
          minimum_should_match: 1,
        },
      },
      size: limit,
    };

    this.logger.debug({ method, body });

    const response = await this.searchClient.search<
      OpensearchResult<OpensearchBrandEntity>
    >({
      index: this.indexName,
      body,
    });
    this.logger.debug({ method, response: response.body });

    const result = response.body.hits.hits.map((hit) => {
      return {
        id: hit._source.id,
        prod_heir: hit._source.prod_heir,
        name: hit._source.name,
      };
    });
    await this.setSearchCacheResult(searchKey, result);

    this.logger.trace({ method }, 'END');
    return result;
  }
}
