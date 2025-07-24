import { Brackets, DataSource } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  FEATURE_FLAG_SERVICE,
  FeatureFlagService,
} from '@wings-corporation/nest-feature-flag';
import { KeyUtil } from '@wings-corporation/utils';
import { FeatureFlagNameEnum } from '@wings-online/app.constants';
import { CacheUtil, UserIdentity } from '@wings-online/common';

import { TypeOrmBrandEntity } from '../entities';
import { TypeOrmBrandNewEntity } from '../entities/typeorm.brand-new.entity';
import {
  GetBrandItems,
  IBrandReadRepository,
} from '../interfaces/brand.read-repository.interface';
import { MAX_CACHE_TTL_MS } from '../product-catalog.constants';
import { BrandReadModel } from '../read-models/brand.read-model';
import { TypeOrmProductHelperRepository } from './typeorm.product-helper.repository';

@Injectable()
export class TypeOrmBrandReadRepository implements IBrandReadRepository {
  private readonly productHelper: TypeOrmProductHelperRepository;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(FEATURE_FLAG_SERVICE)
    private readonly featureFlagService: FeatureFlagService,
  ) {
    this.productHelper = new TypeOrmProductHelperRepository(dataSource);
  }

  private async useCache(): Promise<boolean> {
    const isApiCacheEnabled = await this.featureFlagService.isEnabled(
      FeatureFlagNameEnum.EnableAPICache,
    );
    return !isApiCacheEnabled;
  }

  async listBrands(params: GetBrandItems): Promise<BrandReadModel[]> {
    const { identity, ...rest } = params;
    const validProductQuery = this.productHelper
      .getValidProductQuery(params.identity)
      .andWhere('item_info.brandId = itemBrand.id');

    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmBrandNewEntity, 'brand')
      .innerJoin('brand.brand', 'itemBrand')
      .leftJoin('brand.brandCategory', 'categories')
      .leftJoin('categories.category', 'category')
      .leftJoin('category.info', 'categoryInfo')
      .addSelect([
        'itemBrand.id',
        'categories.categoryId',
        'category.id',
        'category.type',
        'categoryInfo.id',
        'categoryInfo.name',
        'categoryInfo.icon',
        'categoryInfo.image',
      ])
      .andWhere(
        new Brackets((qb) => {
          qb.where(`EXISTS (${validProductQuery.getQuery()})`);
        }),
      );

    if (params.identity.organization === 'WS') {
      queryBuilder.andWhere("brand.flagWs = 'x'");
    } else {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('brand.flagWs is null');
          qb.orWhere(`lower(brand.flagWs) != 'x'`);
        }),
      );
    }

    if (params.type) {
      queryBuilder.andWhere('category.type = :categoryType', {
        categoryType: params.type,
      });
    }

    if (params.ids && params.ids.length > 0) {
      queryBuilder.andWhere('itemBrand.id IN (:...ids)', { ids: params.ids });
      queryBuilder.addSelect(
        `${this.generateCustomSelectColumForOrderByIdArray(params.ids)}`,
        'order_ids',
      );
      queryBuilder.addOrderBy('order_ids', 'ASC');
    }

    queryBuilder.setParameters(validProductQuery.getParameters());

    if (params.useCache) {
      queryBuilder.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:brands:${CacheUtil.encode(rest)}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const entities = await queryBuilder
      .addOrderBy('brand.description')
      .getMany();

    return entities.map((entity) => ({
      id: entity.brand.id,
      name: entity.description,
      image: entity.image,
      prod_heir: entity.prodHeir,
      category_id: entity.brandCategory?.categoryId || null,
      category_name: entity.brandCategory?.category?.info?.name || null,
      category_icon: entity.brandCategory?.category?.info?.icon || null,
      category_image: entity.brandCategory?.category?.info?.image || null,
      category_type: entity.brandCategory?.category?.type || null,
    }));
  }

  public async getTagBrands(tags: string[], identity: UserIdentity) {
    const tagToBrands = new Map<string, Set<string>>();

    if (tags.length === 0) return tagToBrands;

    const validProductQuery = this.productHelper
      .getValidProductQuery(identity)
      .andWhere('item_info.brandId = brand.id');

    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmBrandEntity, 'brand')
      .select([
        'brand.description as brand',
        'brandItemSalesConfigs.tags as tags',
      ])
      .innerJoin('brand.itemInfo', 'itemInfo')
      .innerJoin('itemInfo.item', 'brandItem')
      .innerJoin('brandItem.salesConfigs', 'brandItemSalesConfigs')
      .where('brandItemSalesConfigs.tags && ARRAY[:...tags]::text[]', { tags })
      .andWhere('brandItemSalesConfigs.key IN (:...salesConfigKeys)', {
        salesConfigKeys: KeyUtil.getSalesConfigKeys(identity),
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where(`EXISTS (${validProductQuery.getQuery()})`);
        }),
      )
      .groupBy('brand.description, brandItemSalesConfigs.tags');

    queryBuilder.setParameters(validProductQuery.getParameters());

    const useCache = await this.useCache();
    if (useCache) {
      queryBuilder.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:tags:${tags.sort().join(',')}:brands`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const result: { brand: string; tags: string[] }[] =
      await queryBuilder.getRawMany();

    result.forEach(({ brand, tags }) => {
      tags.forEach((tag) => {
        if (!tagToBrands.has(tag)) {
          tagToBrands.set(tag, new Set());
        }
        tagToBrands.get(tag)!.add(brand);
      });
    });
    return tagToBrands;
  }

  /**
   *
   * @param id
   */
  private generateCustomSelectColumForOrderByIdArray(ids: string[]): string {
    const mapped = ids.map(
      (id, index) => `WHEN itemBrand.id = '${id}' THEN ${index}`,
    );
    return `(CASE ${mapped.join(' ')} END)`;
  }
}
