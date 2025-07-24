import { uniq } from 'lodash';
import { Brackets, DataSource, SelectQueryBuilder } from 'typeorm';

import { Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  Collection,
  DivisionEnum,
  PaginatedCollection,
} from '@wings-corporation/core';
import { Quantity } from '@wings-corporation/domain';
import {
  FEATURE_FLAG_SERVICE,
  FeatureFlagService,
} from '@wings-corporation/nest-feature-flag';
import { KeyUtil } from '@wings-corporation/utils';
import { FeatureFlagNameEnum } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';
import {
  BaseReadModelMapper,
  BaseReadRepository,
  CacheUtil,
  PaginationUtil,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';
import { ParameterService } from '@wings-online/parameter/parameter.service';
import {
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmRecommendationSimilarEntity,
} from '@wings-online/product-catalog/entities';

import {
  LegacyCustomerRewardStatus,
  LegacyVoucherType,
  TypeOrmBestSellerEntity,
  TypeOrmCustItemHistoryEntity,
  TypeOrmItemEntity,
  TypeOrmItemPriceEntity,
  TypeOrmRecommendationCsEntity,
  TypeOrmRecommendationUsEntity,
  TypeOrmVoucherEntity,
} from '../entities';
import { TypeOrmCartTagEntity } from '../entities/typeorm.cart-tag.entity';
import {
  GetBestSellerProductsParams,
  GetBrandVariantsParams,
  GetCategoryProductsParams,
  GetListProductsParams,
  IProductHelperRepository,
  IProductReadRepository,
  ListFlashSalesProductsParams,
  ProductFilterCondition,
  ProductSortCondition,
} from '../interfaces';
import { ProductMapper } from '../mappers';
import { VariantMapper } from '../mappers/variant.read-model.mapper';
import {
  MAX_CACHE_TTL_MS,
  PRODUCT_HELPER_REPOSITORY,
  ProductLabel,
  ProductType,
} from '../product-catalog.constants';
import {
  IPromoReadRepository,
  PROMO_READ_REPOSITORY,
  PromoTypes,
  TypeOrmPromoCMSCriteriaBenefitEntity,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoCMSEntity,
  TypeOrmPromoCMSTargetEntity,
} from '../promotion';
import {
  FlashSaleReadModel,
  ProductReadModel,
  VariantReadModel,
  VoucherReadModel,
} from '../read-models';
import { CartItemReadModel } from '../read-models/cart-item.read-model';
import { CartTagReadModel } from '../read-models/cart-tag.read-model';

type GetBestSellerProductsCursor = {
  seq: number;
};

type PriorityJoin =
  | 'recommendationUs'
  | 'recommendationCs'
  | 'recommendationSimilar'
  | 'bestSeller';

type GetBaseQueryParams = {
  filter?: ProductFilterCondition;
  sort?: ProductSortCondition;

  priorityJoins?: Array<PriorityJoin>;

  withoutPromoTpr?: boolean;
  withPromoCms?: boolean;
};

export class TypeOrmProductReadRepository
  extends BaseReadRepository
  implements IProductReadRepository
{
  private readonly productMapper: BaseReadModelMapper<
    TypeOrmItemEntity,
    ProductReadModel
  >;

  private readonly variantMapper: BaseReadModelMapper<
    TypeOrmItemEntity,
    VariantReadModel
  >;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(PROMO_READ_REPOSITORY)
    private readonly promoRepository: IPromoReadRepository,
    @Inject(PRODUCT_HELPER_REPOSITORY)
    private readonly helperRepository: IProductHelperRepository,
    private readonly parameterService: ParameterService,
    @Inject(FEATURE_FLAG_SERVICE)
    private readonly featureFlagService: FeatureFlagService,
  ) {
    super();
    this.productMapper = new ProductMapper(this.parameterService);
    this.variantMapper = new VariantMapper();
  }

  private async useCache(): Promise<boolean> {
    const isApiCacheEnabled = await this.featureFlagService.isEnabled(
      FeatureFlagNameEnum.EnableAPICache,
    );
    return !isApiCacheEnabled;
  }

  // Helper function for price subquery
  private getPriceSubQuery(
    identity: UserIdentity,
  ): SelectQueryBuilder<TypeOrmItemPriceEntity> {
    return this.dataSource
      .createQueryBuilder(TypeOrmItemPriceEntity, 'p')
      .select('p.price')
      .where('p.itemId = item.id')
      .andWhere('p.priceKey in (:...priceKeys)', {
        priceKeys: KeyUtil.getSalesPriceKeys(identity),
      })
      .andWhere('p.validFrom <= now()')
      .andWhere('p.validTo >= now()')
      .orderBy('p.tier', 'DESC')
      .limit(1);
  }

  private getBaseQuery(
    identity: UserIdentity,
    params?: GetBaseQueryParams,
  ): SelectQueryBuilder<TypeOrmItemEntity> {
    const { dry, frozen } = identity.division;

    const query = this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoinAndSelect('item.info', 'info')
      .leftJoin('info.brand', 'brand')
      .addSelect(['brand.description'])
      .andWhere('item.isActive = true')
      .andWhere('item.entity = :entity', { entity: identity.organization });

    for (const join of params?.priorityJoins || []) {
      this.applyJoin(query, join, identity);
    }

    query
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .andWhere('exclusions.itemId IS NULL')
      .leftJoinAndSelect(
        'item.salesFactors',
        'salesFactors',
        'salesFactors.key in (:...factorKeys) AND salesFactors.validFrom <= now() AND salesFactors.validTo >= now()',
        {
          factorKeys: KeyUtil.getSalesFactorKeys(identity),
        },
      )
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .innerJoinAndSelect(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        },
      );

    if (!params?.withoutPromoTpr)
      this.helperRepository.joinPromoTPRQuery(query, identity);

    const labelFilter = params?.filter?.label;
    const labels = labelFilter
      ? labelFilter?.in
        ? labelFilter.in
        : [labelFilter.equals]
      : [];

    const onlyPromoCms =
      labels.includes(ProductLabel.APP_PROMOTION) ||
      labels.includes(ProductLabel.FLASH_SALE);

    if (onlyPromoCms || params?.withPromoCms) {
      const activePromotionOnly = onlyPromoCms
        ? 'AND promo.periodFrom <= now() AND promo.periodTo >= now()'
        : '';
      query
        .leftJoinAndMapMany(
          'item.promoCMSCriteria',
          TypeOrmPromoCMSCriteriaEntity,
          'criteria',
          '(item.id)::varchar = criteria.itemId OR criteria.tag = ANY(salesConfigs.tags)',
        )
        .leftJoinAndMapOne(
          'criteria.promo',
          TypeOrmPromoCMSEntity,
          'promo',
          `criteria.promoId = promo.id AND promo.organization in (:...organizations) ${activePromotionOnly}`,
        )
        .leftJoinAndMapOne(
          'promoCMSCriteria.benefit',
          TypeOrmPromoCMSCriteriaBenefitEntity,
          'benefit',
          'benefit.promoCriteriaId = criteria.id',
        )
        .leftJoin(
          TypeOrmPromoCMSTargetEntity,
          'target',
          'promo.id = target.promoId',
        )
        .andWhere(
          new Brackets((sub) => {
            const { dry, frozen } = identity.division;
            if (dry) {
              sub.orWhere(
                new Brackets((innner) => {
                  innner.andWhere('info.type = :dryType', {
                    dryType: DivisionEnum.DRY,
                  });
                  innner.andWhere('target.salesOffice = :drySalesOffice', {
                    drySalesOffice: dry.salesOffice,
                  });
                  innner.andWhere('target.group = :dryGroup', {
                    dryGroup: dry.group,
                  });
                }),
              );
            }
            if (frozen) {
              sub.orWhere(
                new Brackets((innner) => {
                  innner.andWhere('info.type = :frozenType', {
                    frozenType: DivisionEnum.FROZEN,
                  });
                  innner.andWhere('target.salesOffice = :frozenSalesOffice', {
                    frozenSalesOffice: frozen.salesOffice,
                  });
                  innner.andWhere('target.group = :frozenGroup', {
                    frozenGroup: frozen.group,
                  });
                }),
              );
            }
          }),
        );
    }

    !params?.priorityJoins?.includes('recommendationUs') &&
      this.applyJoin(query, 'recommendationUs', identity);
    !params?.priorityJoins?.includes('recommendationCs') &&
      this.applyJoin(query, 'recommendationCs', identity);
    !params?.priorityJoins?.includes('recommendationSimilar') &&
      this.applyJoin(query, 'recommendationSimilar', identity);
    !params?.priorityJoins?.includes('bestSeller') &&
      this.applyJoin(query, 'bestSeller', identity);

    query
      .leftJoin('item.wishlistItems', 'wishlistItems')
      .addSelect('wishlistItems.wishlistId')
      .leftJoin(
        'wishlistItems.wishlist',
        'wishlist',
        'wishlist.buyerId = :buyerId',
      )
      .addSelect(['wishlist.id', 'wishlist.isDefault'])

      .leftJoinAndMapOne(
        'item.custItemHistory',
        TypeOrmCustItemHistoryEntity,
        'custItemHistory',
        "item.externalId = custItemHistory.externalId AND custItemHistory.flagRedline = 'Y' AND custItemHistory.buyerExternalId = :externalId",
      )
      .addSelect('custItemHistory.id')
      .setParameter('externalId', identity.externalId)
      .setParameter('buyerId', identity.id)
      .setParameter('organizations', ['*', identity.organization]);

    const dryOnly = dry && !frozen;
    const frozenOnly = !dry && frozen;

    if (dryOnly) {
      query.andWhere('info.type = :productType', {
        productType: ProductType.DRY,
      });
    } else if (frozenOnly) {
      query.andWhere('info.type = :productType', {
        productType: ProductType.FROZEN,
      });
    }

    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    if (isRetailS) {
      query.leftJoinAndSelect(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );

      if (
        identity.division.dry?.isRetailS &&
        identity.division.frozen?.isRetailS
      ) {
        query.andWhere('retailConfigs.itemId IS NOT NULL');
      } else if (identity.division.dry?.isRetailS) {
        query.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        query.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'DRY')`,
        );
      }
    }

    if (params?.filter) {
      const { brandId, label, het, variant, packSize, id, categoryId, tag } =
        params.filter;

      if (id) {
        if (id.in && id.in.length > 0) {
          query.andWhere('item.id in (:...id)', {
            id: id.in,
          });
        } else if (id.equals) {
          query.andWhere('item.id = :id', {
            id: id.equals,
          });
        }
      }

      if (brandId) {
        if (brandId.in) {
          query.andWhere('info.brandId in (:...brand)', {
            brand: brandId.in,
          });
        } else if (brandId.equals) {
          query.andWhere('info.brandId = :brand', {
            brand: brandId.equals,
          });
        }
      }

      if (label) {
        const labels = label.in ? label.in : [label.equals];
        const labelConditions: string[] = [];

        for (const label of labels) {
          switch (label) {
            case ProductLabel.RECOMMENDED:
              labelConditions.push(
                'COALESCE(recommendationCs.id, recommendationUs.id, recommendationSimilar.id) IS NOT NULL',
              );
              break;

            case ProductLabel.LOW_STOCK:
              labelConditions.push('custItemHistory.material_id IS NOT NULL');
              break;

            case ProductLabel.BEST_SELLER:
              labelConditions.push('bestSeller.material_id IS NOT NULL');
              break;

            case ProductLabel.FLASH_SALE:
              labelConditions.push(`(promo.type = '${PromoTypes.FlashSale}')`);
              break;

            case ProductLabel.APP_PROMOTION:
              labelConditions.push(`(promo.type = '${PromoTypes.Regular}')`);
            default:
              break;
          }
        }

        // Combine all label conditions with OR
        if (labelConditions.length) {
          query.andWhere(
            new Brackets((qb) => {
              qb.where(labelConditions.join(' OR '));
            }),
          );
        }
      }

      if (het) {
        const hetQuery = `SELECT COALESCE((SELECT NULLIF(regexp_replace(p.value, '\\D', '', 'g'), '')::int + 100 FROM public.m_parameter p WHERE p.parameter_id = 'price_het' LIMIT 1), 100.0) / 100.0 AS val`;
        const priceQuery = this.getPriceSubQuery(identity).getQuery();

        if (het.in) {
          const conditions = het.in
            .map((range) => {
              const [min, max] = range.split('-').map(Number);
              if (min && max) {
                // Range with both min and max (e.g., 1000-2000)
                return `CEIL(((${priceQuery}) * (${hetQuery})) / 500) * 500 BETWEEN ${min} AND ${max}`;
              } else if (max) {
                // Only max defined (e.g., 0-1000)
                return `CEIL(((${priceQuery}) * (${hetQuery})) / 500) * 500 <= ${max}`;
              } else if (min) {
                // Only min defined (e.g., 1000-)
                return `CEIL(((${priceQuery}) * (${hetQuery})) / 500) * 500 >= ${min}`;
              }
              return null;
            })
            .filter((condition) => condition !== null);

          // Combine all the conditions using OR
          if (conditions.length) {
            query.andWhere(`(${conditions.join(' OR ')})`);
          }
        } else if (het.equals) {
          const [min, max] = het.equals.split('-').map(Number);

          if (min && max) {
            // When both min and max are defined (non-zero) (1000-2000)
            query.andWhere(
              `CEIL(((${priceQuery}) * (${hetQuery})) / 500) * 500 BETWEEN :min AND :max`,
              { min, max },
            );
          } else if (max) {
            // When only max is defined (0-1000)
            query.andWhere(
              `CEIL(((${priceQuery}) * (${hetQuery})) / 500) * 500 <= :max`,
              { max },
            );
          } else if (min) {
            // When only min is defined (1000-)
            query.andWhere(
              `CEIL(((${priceQuery}) * (${hetQuery})) / 500) * 500 >= :min`,
              { min },
            );
          }
        }
      }

      if (variant) {
        if (variant.in) {
          query.andWhere('info.variant in (:...variant)', {
            variant: variant.in,
          });
        } else if (variant.equals) {
          query.andWhere('info.variant = :variant', {
            variant: variant.equals,
          });
        }
      }

      if (packSize) {
        if (packSize.in) {
          query.andWhere('info.packSize in (:...packSize)', {
            packSize: packSize.in,
          });
        } else if (packSize.equals) {
          query.andWhere('info.packSize = :packSize', {
            packSize: packSize.equals,
          });
        }
      }

      if (categoryId) {
        if (categoryId.in) {
          query.andWhere('info.categoryId in (:...categoryId)', {
            categoryId: categoryId.in,
          });
        } else if (categoryId.equals) {
          query.andWhere('info.categoryId = :categoryId', {
            categoryId: categoryId.equals,
          });
        }
      }

      if (tag) {
        if (tag.in) {
          query.andWhere('salesConfigs.tags && ARRAY[:...tags]', {
            tags: tag.in,
          });
        } else if (tag.equals) {
          query.andWhere(':tag = ANY(salesConfigs.tags)', { tag: tag.equals });
        }
      }
    }

    if (params?.sort) {
      const { price, name, weight, id, wishlist } = params.sort;

      if (name) {
        query
          .addOrderBy('info.name', name)
          .addOrderBy('item.weightInKg', 'ASC');
      } else if (price) {
        const subQuery = this.getPriceSubQuery(identity).getQuery();

        query
          .addSelect(`(${subQuery})`, 'effective_price')
          .addOrderBy('effective_price', price)
          .addOrderBy('info.name', 'ASC');
      } else if (weight) {
        query
          .addOrderBy('item.weightInKg', weight)
          .addOrderBy('info.name', 'ASC');
      }

      if (id) {
        query.addSelect(
          `${this.generateCustomSelectColumForOrderByIdArray(id)}`,
          'order_ids',
        );
        query.addOrderBy('order_ids', 'ASC');
      }

      // replace all sorting with whistlist specific sort
      if (wishlist) {
        query
          .orderBy('recommendationUs.seq', 'ASC')
          .addOrderBy('recommendationCs.seq', 'ASC')
          .addOrderBy('recommendationSimilar.seq', 'ASC')
          .addOrderBy('info.isNew', 'DESC')
          .addOrderBy('info.name', 'ASC');
      }
    }

    return query;
  }

  private applyJoin(
    query: SelectQueryBuilder<TypeOrmItemEntity>,
    join: PriorityJoin,
    identity: UserIdentity,
  ) {
    switch (join) {
      case 'recommendationUs':
        return query
          .leftJoinAndMapOne(
            'item.recommendationUs',
            TypeOrmRecommendationUsEntity,
            'recommendationUs',
            'item.externalId = recommendationUs.externalId AND recommendationUs.buyerExternalId = :externalId',
          )
          .addSelect([
            'recommendationUs.id',
            'recommendationUs.baseQty',
            'recommendationUs.packQty',
          ]);
      case 'recommendationCs':
        return query
          .leftJoinAndMapOne(
            'item.recommendationCs',
            TypeOrmRecommendationCsEntity,
            'recommendationCs',
            'item.externalId = recommendationCs.externalId AND recommendationCs.buyerExternalId = :externalId',
          )
          .addSelect([
            'recommendationCs.id',
            'recommendationCs.baseQty',
            'recommendationCs.packQty',
          ]);
      case 'recommendationSimilar':
        return query
          .leftJoinAndMapOne(
            'item.recommendationSimilar',
            TypeOrmRecommendationSimilarEntity,
            'recommendationSimilar',
            'item.externalId = recommendationSimilar.externalId AND recommendationSimilar.buyerExternalId = :externalId',
          )
          .addSelect([
            'recommendationSimilar.id',
            'recommendationSimilar.baseQty',
            'recommendationSimilar.packQty',
          ]);
      case 'bestSeller':
        return query.leftJoinAndMapOne(
          'item.bestSeller',
          TypeOrmBestSellerEntity,
          'bestSeller',
          `item.externalId = bestSeller.material_id AND ${
            identity.organization === 'WS'
              ? `bestSeller.flagWs = 'x'`
              : `(bestSeller.flagWs = '')`
          }`,
        );
      default:
        return;
    }
  }

  async getProductInfo(
    identity: UserIdentity,
    id: string,
  ): Promise<ProductReadModel | undefined> {
    const queryBuilder = this.getBaseQuery(identity).andWhere('item.id = :id', {
      id,
    });

    const useCache = await this.useCache();
    if (useCache) {
      queryBuilder.cache(
        CacheUtil.getCacheKey(`user:${identity.externalId}:product:${id}`),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const entity = await queryBuilder.getOne();

    return entity ? this.productMapper.toReadModel(entity) : undefined;
  }

  async getProductIdByExternalId(
    identity: UserIdentity,
    externalId: string,
  ): Promise<string | undefined> {
    return this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .where('item.externalId = :externalId', { externalId })
      .andWhere('item.entity = :entity', { entity: identity.organization })
      .select('item.id')
      .getOne()
      .then((item) => item?.id);
  }

  async listProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const query = this.getBaseQuery(identity, {
      filter,
      sort,
      withoutPromoTpr: params.withoutPromoTpr,
    })
      .take(pageSize)
      .skip(offset);

    if (params.excludeInsideCart) {
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('cartItems.itemId', 'id')
          .from(TypeOrmCartEntity, 'cart')
          .innerJoin('cart.items', 'cartItems')
          .where(`cart.buyerId = '${identity.id}'`)
          .getQuery();
        return `item.id NOT IN (${subQuery})`;
      });
    } else {
      const useCache = await this.useCache();
      if (useCache) {
        query.cache(
          CacheUtil.getCacheKey(
            `user:${identity.externalId}:products:${CacheUtil.encode(params)}`,
          ),
          CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
        );
      }
    }

    const [items, totalCount] = await query.getManyAndCount();

    return {
      data: items.map((item) => this.productMapper.toReadModel(item)),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  /**
   * list product that has TPR Promo
   * @param params
   * @returns
   */
  async listTPRProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const query = this.getBaseQuery(identity, {
      filter,
      sort,
    });

    query
      .andWhere('tprTarget.id is not null')
      .andWhere(
        '(tprPromo.useDestCode = false or tprDestInfo.destCode is not NULL)',
      )
      .take(pageSize)
      .skip(offset);

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:products:tpr:${CacheUtil.encode(
            params,
          )}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query.getManyAndCount();

    return {
      data: items
        .map((item) => this.productMapper.toReadModel(item))
        .filter((item) => item.promotion.promotions.length),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  async getNewProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const query = this.getBaseQuery(identity, {
      filter,
      sort,
    }).andWhere('info.is_new = :isNew', {
      isNew: true,
    });

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:products:new:${CacheUtil.encode(
            params,
          )}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query
      .take(pageSize)
      .skip(offset)
      .getManyAndCount();

    return {
      data: items.map((item) => this.productMapper.toReadModel(item)),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  async getCategoryProducts(
    params: GetCategoryProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const { categoryId, ...otherParams } = params;

    const query = this.getBaseQuery(identity, {
      filter,
      sort,
    })
      .andWhere('info.categoryId = :categoryId', {
        categoryId,
      })
      .take(pageSize)
      .skip(offset);

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${
            identity.externalId
          }:products:category:${categoryId}:${CacheUtil.encode(otherParams)}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query.getManyAndCount();

    return {
      data: items.map((item) => this.productMapper.toReadModel(item)),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  async getSelectedProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const query = this.getBaseQuery(identity, {
      filter,
      sort,
      priorityJoins: ['recommendationCs'],
    }).andWhere('recommendationCs.id IS NOT NULL');

    if (sort?.sequence) {
      query.addOrderBy('recommendationCs.seq', sort?.sequence);
    }

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:products:selected:${CacheUtil.encode(
            params,
          )}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query
      .take(pageSize)
      .skip(offset)
      .getManyAndCount();

    return {
      data: items.map((item) => this.productMapper.toReadModel(item)),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  async getFrequentlyPurchasedProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );
    const query = this.getBaseQuery(identity, {
      filter,
      sort,
      priorityJoins: ['recommendationUs'],
    }).andWhere('recommendationUs.id IS NOT NULL');

    if (sort?.sequence) {
      query.addOrderBy('recommendationUs.seq', sort?.sequence);
    }

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${
            identity.externalId
          }:products:frequently-purchased:${CacheUtil.encode(params)}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query
      .take(pageSize)
      .skip(offset)
      .getManyAndCount();

    return {
      data: items.map((item) => this.productMapper.toReadModel(item)),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  async getSimilarProducts(
    params: GetListProductsParams & Partial<{ categoryId: number }>,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort, categoryId } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const query = this.getBaseQuery(identity, {
      filter,
      sort,
      priorityJoins: ['recommendationSimilar'],
    });

    if (categoryId) {
      query.andWhere('info.categoryId = :categoryId', {
        categoryId: categoryId,
      });
    }

    if (sort?.sequence) {
      query.addOrderBy('recommendationSimilar.seq', sort?.sequence);
    }

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:products:similar:${CacheUtil.encode(
            params,
          )}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query
      .andWhere('recommendationSimilar.id IS NOT NULL')
      .take(pageSize)
      .skip(offset)
      .getManyAndCount();

    return {
      data: items.map((item) => this.productMapper.toReadModel(item)),
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  async getBestSellerProducts(
    params: GetBestSellerProductsParams,
  ): Promise<Collection<ProductReadModel>> {
    const { limit, cursor, identity, categoryId } = params;

    const query = this.getBaseQuery(identity, {
      priorityJoins: ['bestSeller'],
    })
      .andWhere('bestSeller.id IS NOT NULL')
      .orderBy('bestSeller.seq', 'ASC')
      .take(limit + 1);

    if (categoryId) {
      query.andWhere('info.categoryId = :categoryId', {
        categoryId: categoryId,
      });
    }

    if (cursor) {
      const value = this.decodeCursor<GetBestSellerProductsCursor>(cursor);
      if (value) {
        query.andWhere(
          new Brackets((sub) => {
            sub.andWhere('bestSeller.seq >= :seq', {
              seq: value.seq,
            });
          }),
        );
      }
    }

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:products:bestseller:${CacheUtil.encode(
            params,
          )}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const items = await query.getMany();

    const lastItem =
      items.length === params.limit + 1 ? items.pop() : undefined;

    return {
      data: items.map((item) => this.productMapper.toReadModel(item)),
      metadata: {
        nextCursor: lastItem
          ? this.encodeCursor({ seq: lastItem.bestSeller.seq })
          : undefined,
      },
    };
  }

  async getProductInfoByBarcode(
    identity: UserIdentity,
    barcode: string,
  ): Promise<ProductReadModel | undefined> {
    const query = this.getBaseQuery(identity);

    const entity = await query
      .innerJoinAndSelect('item.barcode', 'barcode')
      .andWhere(
        new Brackets((sub) => {
          sub.where(
            'barcode.baseBarcode = :barcode OR barcode.packBarcode = :barcode',
            { barcode },
          );
        }),
      )
      .getOne();

    return entity ? this.productMapper.toReadModel(entity) : undefined;
  }

  async getBrandVariants(
    params: GetBrandVariantsParams,
  ): Promise<VariantReadModel[]> {
    const { identity } = params;

    const query = this.getBaseQuery(identity, {
      withoutPromoTpr: true,
    }).andWhere(`info.brandId = :brandId`, {
      brandId: params.id,
    });

    const items = await query.getMany();

    return items.map(this.variantMapper.toReadModel);
  }

  async isProductExistsByBarcode(barcode: string): Promise<boolean> {
    return await this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoin('item.barcode', 'barcode')
      .andWhere(
        'barcode.baseBarcode = :barcode OR barcode.packBarcode = :barcode',
        { barcode },
      )
      .getExists();
  }

  async listFlashSaleProducts(
    params: ListFlashSalesProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>> {
    const { identity, filter, sort, status } = params;
    const { offset, page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const promos = await this.promoRepository.getFlashSaleItems({
      identity,
      status,
    });
    // exclude items that have quota reach max
    const filteredItems = promos.filter(
      (f) => f.benefit.maxQty > f.redeemedQty,
    );

    if (filteredItems.length === 0) {
      return {
        data: [],
        metadata: {
          page,
          pageSize,
          totalCount: 0,
        },
      };
    }

    const criteriaIds = filteredItems.map((x) => x.criteria.id);

    const query = this.getBaseQuery(identity, {
      filter,
      sort,
      withPromoCms: true,
    })
      .andWhere('criteria.id in (:...criteriaIds)', {
        criteriaIds: filteredItems.map((x) => x.criteria.id),
      })
      .addOrderBy('criteria.sequence', 'ASC');

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:products:flashsale:${CacheUtil.encode({
            ...params,
            criteriaIds,
          })}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }

    const [items, totalCount] = await query
      .take(pageSize)
      .skip(offset)
      .getManyAndCount();

    const products = items.map((item) => this.productMapper.toReadModel(item));

    const promoMap = promos.reduce<Record<string, FlashSaleReadModel>>(
      (acc, promo) => {
        if (promo.target.type === 'TAG') {
          const items = products.filter((p) => {
            return p.tags.some((t) => promo.target.value === t.toString());
          });
          for (const item of items) {
            acc[item.id] = promo;
          }
        } else {
          acc[promo.target.value] = promo;
        }
        return acc;
      },
      {},
    );

    for (const product of products) {
      const promo = promoMap[product.id];
      if (promo) product.applyFlashSale(promo);
    }

    return {
      data: products,
      metadata: {
        page,
        pageSize,
        totalCount,
      },
    };
  }

  /**
   *
   * @param id
   */
  private generateCustomSelectColumForOrderByIdArray(ids: string[]): string {
    const mapped = ids.map(
      (id, index) => `WHEN item.id = '${id}' THEN ${index}`,
    );
    return `(CASE ${mapped.join(' ')} END)`;
  }

  private async findProductExternalId(productId: string): Promise<string> {
    const entity = await this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .select('item.externalId')
      .where('item.id = :id', { id: productId })
      .getOneOrFail();

    return String(entity.externalId);
  }

  public async findProductTags(
    productId: string,
    identity: UserIdentity,
  ): Promise<Tag[]> {
    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmItemSalesConfigEntity, 'salesConfig')
      .andWhere('salesConfig.itemId = :itemId', { itemId: productId })
      .andWhere('salesConfig.key in (:...keys)', {
        keys: KeyUtil.getSalesConfigKeys(identity),
      })
      .getMany();

    const configs = entities.map((entity) =>
      SalesUtil.mapToSalesItemConfig(entity),
    );
    const config = SalesUtil.getEffectiveSalesConfig(configs);
    const tags: Tag[] = config?.tags || [];
    return tags;
  }

  async listProductVouchers(
    identity: UserIdentity,
    productId: string,
  ): Promise<VoucherReadModel[]> {
    const vouchers: VoucherReadModel[] = [];

    const productExternalId = await this.findProductExternalId(productId);
    const tags = await this.findProductTags(productId, identity);

    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmVoucherEntity, 'voucher')
      .addSelect('customerReward.expiredDate')
      // filter only voucher that the customer owns
      .innerJoin('voucher.customerReward', 'customerReward')
      .andWhere('customerReward.externalId = :externalId', {
        externalId: identity.externalId,
      })
      // filter only voucher that is not used
      .andWhere('customerReward.status = :status', {
        status: 'Not Used' as LegacyCustomerRewardStatus,
      })
      // find material that applies to this customer
      .innerJoin('voucher.target', 'target')
      .andWhere(
        new Brackets((qb) => {
          qb.orWhere('target.customerExternalId = :externalId', {
            externalId: identity.externalId,
          });
          if (identity.division.dry) {
            qb.orWhere(
              new Brackets((qb) => {
                qb.andWhere('target.slsOffice = :drySlsOffice', {
                  drySlsOffice: identity.division.dry!.salesOffice,
                });
                qb.andWhere('target.custGroup = :dryCustGroup', {
                  dryCustGroup: identity.division.dry!.group,
                });
                qb.andWhere(`(target.customerExternalId = '') IS NOT FALSE`);
              }),
            );
          }
          if (identity.division.frozen) {
            qb.orWhere(
              new Brackets((qb) => {
                qb.andWhere('target.slsOffice = :frozenSlsOffice', {
                  frozenSlsOffice: identity.division.frozen!.salesOffice,
                });
                qb.andWhere('target.custGroup = :frozenCustGroup', {
                  frozenCustGroup: identity.division.frozen!.group,
                });
                qb.andWhere(`(target.customerExternalId = '') IS NOT FALSE`);
              }),
            );
          }
        }),
      )
      .innerJoin('target.material', 'material')
      .andWhere(
        new Brackets((qb) => {
          // filter only voucher that targets the item specified
          qb.andWhere('material.materialId = :materialId', {
            materialId: productExternalId,
          });

          // filter only voucher that targets the item material group 2
          for (const tag of tags.filter((tag) => tag.key === 'grp02')) {
            qb.orWhere('material.matGrp2 = :tag', { tag: tag.value });
          }
        }),
      )
      // exclude general voucher
      .andWhere('voucher.isGeneral = 0')
      // filter only discount voucher
      .andWhere('voucher.type = :type', {
        type: 'Discount' as LegacyVoucherType,
      })
      // filter only non expiring voucher
      .andWhere('customerReward.expiredDate >= DATE(now())')
      // sorted by nearest `end_date`/`expired_date`
      .addOrderBy('customerReward.expiredDate', 'ASC')
      .getMany();

    for (const entity of entities) {
      const voucher: VoucherReadModel = {
        external_id: entity.id,
        min_purchase: entity.minimumPurchaseAmount,
        max_discount: entity.maximumDiscount,
        discount_type: entity.benefitType,
        discount_value: entity.benefitValue,
        valid_until: entity.customerReward.expiredDate.toISOString(),
      };
      vouchers.push(voucher);
    }

    return vouchers;
  }

  /**
   *
   * @param identity
   * @param tags
   * @returns
   */
  async getTagQtyInCart(
    identity: UserIdentity,
    tags: Tag[],
  ): Promise<CartTagReadModel[]> {
    if (tags.length === 0) return [];

    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmCartTagEntity, 'tags')
      .innerJoinAndSelect('tags.cart', 'cart')
      .innerJoin('cart.items', 'cartItems')
      .addSelect([
        'cartItems.id',
        'cartItems.itemId',
        'cartItems.qty',
        'cartItems.createdAt',
      ])
      .leftJoinAndSelect('cartItems.item', 'item')
      .leftJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .andWhere('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('tags.tag in (:...tags)', {
        tags: tags.map((t) => t.toString()),
      })
      .getMany();

    return entities.map((entity) => ({
      tag: Tag.fromString(entity.tag),
      qty: Quantity.create(entity.qty),
      qtyIntermediate: Quantity.create(entity.qtyIntermediate),
      qtyPack: Quantity.create(entity.qtyPack),
      // TODO: optimize filter cart items by tag
      items: entity.cart.items
        .filter((f) => {
          const salesConfig = SalesUtil.getEffectiveSalesConfig(
            f.item.salesConfigs.map((config) =>
              SalesUtil.mapToSalesItemConfig(config),
            ),
          );
          return (
            f.qty !== 0 &&
            (salesConfig
              ? salesConfig.tags.some((t) =>
                  t.equals(Tag.fromString(entity.tag)),
                )
              : false)
          );
        })
        .map((i) => ({
          itemId: i.itemId,
          qty: Quantity.create(i.qty),
          addedAt: i.createdAt,
        })),
    }));
  }

  async getItemQtyInCart(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<CartItemReadModel[]> {
    if (itemIds.length === 0) return [];

    const entities = await this.dataSource
      .createQueryBuilder(TypeOrmCartItemEntity, 'cartItems')
      .innerJoinAndSelect('cartItems.cart', 'cart')
      .andWhere('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('cartItems.itemId in (:...itemIds)', { itemIds: uniq(itemIds) })
      .getMany();

    return entities.map((entity) => ({
      itemId: entity.itemId,
      qty: Quantity.create(entity.qty),
      addedAt: entity.createdAt,
    }));
  }
}
