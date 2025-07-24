import { Brackets, DataSource } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseReadRepository,
  CacheUtil,
  UserIdentity,
} from '@wings-online/common';

import {
  TypeOrmCategoryEntity,
  TypeOrmCategoryParentEntity,
} from '../entities';
import {
  CategorySortCondition,
  ICategoryReadRepository,
  ICategorySequenceReadRepository,
} from '../interfaces';
import {
  CATEGORY_SEQUENCE_READ_REPOSITORY,
  MAX_CACHE_TTL_MS,
} from '../product-catalog.constants';
import { CategoryReadModel } from '../read-models';
import { TypeOrmProductHelperRepository } from './typeorm.product-helper.repository';

@Injectable()
export class TypeOrmCategoryReadRepository
  extends BaseReadRepository
  implements ICategoryReadRepository
{
  private readonly productHelper: TypeOrmProductHelperRepository;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(CATEGORY_SEQUENCE_READ_REPOSITORY)
    private readonly sequenceRepository: ICategorySequenceReadRepository,
  ) {
    super();
    this.productHelper = new TypeOrmProductHelperRepository(dataSource);
  }
  async listCategories(params: {
    identity: UserIdentity;
    sort?: CategorySortCondition;
  }): Promise<CategoryReadModel[]> {
    const { identity, sort } = params;

    const validProductQuery = this.productHelper
      .getValidProductQuery(identity)
      .andWhere('item_info.categoryId = categoryInfo.id');

    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmCategoryEntity, 'category')
      .innerJoinAndSelect('category.info', 'categoryInfo')
      .leftJoinAndMapOne(
        'categoryInfo.parent',
        TypeOrmCategoryParentEntity,
        'parent',
        `category.id = ANY(parent.m_category_new_id)`,
      )
      .where('categoryInfo.isDelete = false')
      .andWhere(
        new Brackets((qb) => {
          qb.where(`EXISTS (${validProductQuery.getQuery()})`);
        }),
      );

    queryBuilder.setParameters(validProductQuery.getParameters());

    //if sort by sequence, sort id by sequence table value
    let sortBy = 'sort-name';
    if (sort?.sequence) {
      const categorySequence =
        await this.sequenceRepository.getCustomerCategorySequence(identity);
      if (categorySequence) {
        sortBy = 'sort-sequence';
        queryBuilder
          .addSelect(
            this.generateCustomSelectColumForOrderByIdArray(
              categorySequence.categorySequence,
            ),
            'order_ids',
          )
          .orderBy('order_ids', sort.sequence, 'NULLS LAST');
      }
    }

    const entities = await queryBuilder
      .addOrderBy('categoryInfo.name', sort?.name || 'ASC')
      .cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:categories:${sortBy}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      )
      .getMany();

    return entities.map((entity) => ({
      id: entity.info.id,
      name: entity.info.name,
      image: entity.info.image,
      icon: entity.info.icon,
      is_delete: entity.info.isDelete,
      parent: entity.info.parent?.name || null,
      type: entity.type,
    }));
  }

  private generateCustomSelectColumForOrderByIdArray(ids: number[]): string {
    const mapped = ids.map(
      (id, index) => `WHEN category.id = '${id}' THEN ${index}`,
    );
    return `(CASE ${mapped.join(' ')} END)`;
  }
}
