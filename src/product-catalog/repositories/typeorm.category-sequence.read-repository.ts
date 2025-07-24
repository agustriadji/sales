import { DataSource, In } from 'typeorm';

import { InjectDataSource } from '@nestjs/typeorm';
import { CacheUtil, UserIdentity } from '@wings-online/common';

import { TypeOrmCategorySequenceEntity } from '../entities';
import { ICategorySequenceReadRepository } from '../interfaces';
import { MAX_CACHE_TTL_MS } from '../product-catalog.constants';
import { CategorySequenceReadModel } from '../read-models';

export class TypeOrmCategorySequenceReadRepository
  implements ICategorySequenceReadRepository
{
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}
  async getCustomerCategorySequence(
    identity: UserIdentity,
  ): Promise<CategorySequenceReadModel | undefined> {
    const defaultKey = `DEFAULT_${identity.organization}`;
    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmCategorySequenceEntity, 'sequence')
      .where({ customerId: In([identity.externalId, defaultKey]) })
      .addSelect(
        `(CASE WHEN sequence.customer_id = '${identity.externalId}' THEN 1 END)`,
        'top_sequence',
      )
      .orderBy('top_sequence', 'ASC', 'NULLS LAST')
      .cache(
        CacheUtil.getCacheKey(`user:${identity.externalId}:category-sequence`),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      )
      .getMany();

    return entities.length > 0 ? { ...entities[0] } : undefined;
  }
}
