import { Brackets, DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { BaseReadRepository, UserIdentity } from '@wings-online/common';

import { TypeOrmCategoryEntity } from '../entities';
import { TypeOrmCategoryParentEntity } from '../entities/typeorm.category-parent.entity';
import { ICategoryParentReadRepository } from '../interfaces';
import { CategoryParentReadModel } from '../read-models';
import { TypeOrmProductHelperRepository } from './typeorm.product-helper.repository';

@Injectable()
export class TypeOrmCategoryParentReadRepository
  extends BaseReadRepository
  implements ICategoryParentReadRepository
{
  private readonly productHelper: TypeOrmProductHelperRepository;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
    this.productHelper = new TypeOrmProductHelperRepository(dataSource);
  }
  async listCategoryParents(
    identity: UserIdentity,
  ): Promise<CategoryParentReadModel[]> {
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
      .where('categoryInfo.isDelete is not true')
      .andWhere(
        new Brackets((qb) => {
          qb.where(`EXISTS (${validProductQuery.getQuery()})`);
        }),
      );

    queryBuilder.setParameters(validProductQuery.getParameters());

    const entities = await queryBuilder
      .addOrderBy('parent.name', 'ASC')
      .addOrderBy('categoryInfo.name', 'ASC')
      .getMany();

    const grouped = entities.reduce<Record<string, TypeOrmCategoryEntity[]>>(
      (acc, item) => {
        if (item.info.parent) {
          if (!acc[item.info.parent.name]) {
            acc[item.info.parent.name] = [];
          }

          acc[item.info.parent.name].push(item);
        }
        return acc;
      },
      {},
    );

    return Object.keys(grouped).map((key) => ({
      name: key,
      categories: grouped[key].map((c) => ({
        id: c.id,
        name: c.info.name,
        image: c.info.image,
        icon: c.info.icon,
        is_delete: c.info.isDelete,
        parent: null,
        type: c.type,
      })),
    }));
  }
}
