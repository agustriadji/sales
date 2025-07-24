import ms from 'ms';
import { Brackets, DataSource } from 'typeorm';

import { InjectDataSource } from '@nestjs/typeorm';
import {
  Division,
  DivisionEnum,
  Nullable,
  OrganizationEnum,
  PaginatedCollection,
} from '@wings-corporation/core';
import { EntityId } from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import {
  BannerUtil,
  BaseReadRepository,
  CacheUtil,
  PaginationUtil,
  UserIdentity,
  createBadRequestException,
} from '@wings-online/common';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';
import { ProductType } from '@wings-online/product-catalog';
import {
  TypeOrmBrandEntity,
  TypeOrmCategoryEntity,
  TypeOrmItemEntity,
} from '@wings-online/product-catalog/entities';
import {
  PromoTypes,
  TypeOrmPromoCMSCriteriaEntity,
} from '@wings-online/product-catalog/promotion';

import {
  BannerPage,
  BannerPageType,
  DEFAULT_SUGGESTION_BANNER_RESHOW_DAYS,
  MAX_CACHE_TTL_MS,
} from '../banner.constants';
import {
  TypeOrmBannerEntity,
  TypeOrmBuyerInfoEntity,
  TypeOrmClusteringCustEntity,
  TypeOrmClusteringFirebaseEntity,
} from '../entities';
import { GetBannersParams, IBannerReadRepository } from '../interfaces';
import { BannerReadModel, SuggestionBannerReadModel } from '../read-models';
import { BannerFilterUtil } from '../utils/banner-filter.util';

export class TypeOrmBannerReadRepository
  extends BaseReadRepository
  implements IBannerReadRepository
{
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly parameterService: ParameterService,
  ) {
    super();
  }

  private getSubQuery(identity: UserIdentity) {
    const { dry, frozen } = identity.division;
    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    const query = this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .select('1')
      .innerJoin('item.info', 'item_info')
      .andWhere('item.isActive = true')
      .andWhere('item.entity = :entity', { entity: identity.organization })
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .innerJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .innerJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      );

    const dryOnly = dry && !frozen;
    const frozenOnly = !dry && frozen;
    if (dryOnly || frozenOnly) {
      query.andWhere('item_info.type = :type', {
        type: dryOnly ? ProductType.DRY : ProductType.FROZEN,
      });
    }

    if (isRetailS) {
      query.leftJoin(
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
          `(retailConfigs.itemId IS NOT NULL OR item_info.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        query.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR item_info.type = 'DRY')`,
        );
      }
    }

    return query.andWhere('exclusions.itemId IS NULL');
  }

  private getClusteringCustQuery(identity: UserIdentity) {
    return this.dataSource
      .createQueryBuilder(TypeOrmClusteringCustEntity, 'clustering')
      .select('clusteringFirebase.idMessage', 'id')
      .innerJoin('clustering.clusteringFirebase', 'clusteringFirebase')
      .where('clustering.custId = :custId', { custId: identity.externalId });
  }

  private getClusteringFirebaseQuery(identity: UserIdentity, feature: string) {
    const { dry, frozen } = identity.division;
    return this.dataSource
      .createQueryBuilder(TypeOrmClusteringFirebaseEntity, 'clustering')
      .select('clustering.idMessage', 'id')
      .where(
        new Brackets((qb) => {
          if (dry) {
            qb.orWhere(
              '(clustering.slsOffice = :drySalesOffice AND clustering.custGroup = :dryGroup)',
              {
                drySalesOffice: dry.salesOffice,
                dryGroup: dry.group,
              },
            );
          }
          if (frozen) {
            qb.orWhere(
              '(clustering.slsOffice = :frozenSalesOffice AND clustering.custGroup = :frozenGroup)',
              {
                frozenSalesOffice: frozen.salesOffice,
                frozenGroup: frozen.group,
              },
            );
          }
        }),
      )
      .andWhere('clustering.feature = :feature', { feature });
  }

  async getClusteringBannerIds(
    identity: UserIdentity,
    feature: string,
  ): Promise<string[]> {
    const [clusteringCust, clusteringFirebase] = await Promise.all([
      this.getClusteringCustQuery(identity)
        .cache(
          CacheUtil.getCacheKey(
            `user:${identity.externalId}:banners:clustering-cust`,
          ),
          CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
        )
        .getRawMany(),
      this.getClusteringFirebaseQuery(identity, feature)
        .cache(
          CacheUtil.getCacheKey(
            `user:${identity.externalId}:banners:clustering-firebase`,
          ),
          CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
        )
        .getRawMany(),
    ]);

    return [
      ...clusteringCust.map((r) => r.id),
      ...clusteringFirebase.map((r) => r.id),
    ];
  }

  async getBanners(
    params: GetBannersParams,
  ): Promise<PaginatedCollection<BannerReadModel>> {
    const { identity, filter } = params;
    const { dry, frozen } = identity.division;

    const { page, pageSize } = PaginationUtil.getPaginationParams(
      params.page,
      params.pageSize,
    );

    const itemField =
      identity.organization === OrganizationEnum.WS
        ? 'banner.m_material_ws_id'
        : 'banner.m_material_id';

    const query = this.dataSource
      .createQueryBuilder(TypeOrmBannerEntity, 'banner')
      .leftJoinAndMapOne(
        'banner.item',
        TypeOrmItemEntity,
        'item',
        `item.externalId = ${itemField}`,
      )
      .leftJoin('item.info', 'info')
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        { excludeKeys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .leftJoin(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndMapOne(
        'info.category',
        TypeOrmCategoryEntity,
        'category',
        'info.categoryId = category.id',
      )
      .leftJoin('category.info', 'categoryInfo')
      .leftJoinAndMapOne(
        'info.brand',
        TypeOrmBrandEntity,
        'brand',
        'info.brandId = brand.id',
      )
      .leftJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoinAndMapMany(
        'item.promoCMSCriteria',
        TypeOrmPromoCMSCriteriaEntity,
        'criteria',
        '(item.id)::varchar = (criteria.itemId)::varchar OR criteria.tag = ANY(salesConfigs.tags)',
      )
      .leftJoin(
        'criteria.promo',
        'promo',
        'promo.organization IN (:...organizationIds)',
        { organizationIds: ['*', identity.organization] },
      )
      .leftJoin(
        'promo.targets',
        'target',
        `(${
          dry
            ? `(target.salesOffice = :drySalesOffice AND target.group = :dryGroup)`
            : ''
        }
        ${dry && frozen ? ' OR ' : ''}
        ${
          frozen
            ? ` (target.salesOffice = :frozenSalesOffice AND target.group = :frozenGroup)`
            : ''
        })`,
        {
          ...(dry
            ? {
                drySalesOffice: dry.salesOffice,
                dryGroup: dry.group,
              }
            : {}),
          ...(frozen
            ? {
                frozenSalesOffice: frozen.salesOffice,
                frozenGroup: frozen.group,
              }
            : {}),
        },
      )
      .andWhere('banner.isDelete = false')
      .andWhere('banner.isActive = true')
      .andWhere('banner.shownAt IN (:...shownAt)', {
        shownAt: BannerUtil.getBannerShownKeys(identity),
      })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('MIN(b.id)', 'id')
          .from(TypeOrmBannerEntity, 'b')
          .where('b.image = banner.image')
          .andWhere('b.page = banner.page')
          .andWhere('lower(b.type) = lower(banner.type)')
          .getQuery();
        return 'banner.id = ' + subQuery;
      });

    const isRetailS = dry?.isRetailS || frozen?.isRetailS;
    if (isRetailS) {
      query.leftJoin(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
    }

    if (dry || frozen) {
      const clusteringIds = await this.getClusteringBannerIds(
        identity,
        'PromoAds',
      );
      if (clusteringIds.length) {
        query.andWhere('banner.id IN (:...ids)', { ids: clusteringIds });
      } else {
        // If clusteringIds is empty, add a condition that will always be false
        // This effectively excludes all banners
        query.andWhere('1 = 0');
      }
    }

    const dryOnly = dry && !frozen;
    const frozenOnly = !dry && frozen;
    if (dryOnly || frozenOnly) {
      query
        .andWhere('info.type = :type', {
          type: dryOnly ? ProductType.DRY : ProductType.FROZEN,
        })
        .addOrderBy('banner.seq');
    } else {
      query
        .addSelect(
          'ROW_NUMBER() OVER (PARTITION BY info.type ORDER BY banner.seq)',
          'row_number',
        )
        .addOrderBy('row_number', 'ASC')
        .addOrderBy('info.type', 'ASC');
    }

    let bannerType = '';
    if (filter) {
      const { type } = filter;

      if (type) {
        if (type.equals) {
          bannerType = `:${type.equals}`;
          query.andWhere('lower(banner.type) = lower(:bannerType)', {
            bannerType: type.equals,
          });
        }

        if (type.in) {
          query.andWhere('lower(banner.type) in (:...bannerTypes)', {
            bannerTypes: type.in.map((i) => i.toLowerCase()),
          });
        }
      }
    }

    const filteredPages = BannerFilterUtil.getFilteredPages(filter?.pageName);
    const generalPages = filteredPages[BannerPageType.GENERAL];
    const brandPages = filteredPages[BannerPageType.BRAND];
    const categoryPages = filteredPages[BannerPageType.CATEGORY];

    query.andWhere(
      new Brackets((sub) => {
        if (generalPages.length > 0) {
          sub.orWhere(
            new Brackets((subSub) => {
              // Split pages into product detail and other pages
              const productDetailPage = generalPages.find(
                (page) => page === BannerPage.PRODUCT_DETAIL,
              );
              const otherPages = generalPages.filter(
                (page) => page !== BannerPage.PRODUCT_DETAIL,
              );

              // Create a WHERE clause that combines both conditions
              if (productDetailPage) {
                // For product detail page - needs exclusion validation
                subSub.orWhere(
                  new Brackets((productDetailSub) => {
                    productDetailSub
                      .where('banner.page = :productDetailPage', {
                        productDetailPage,
                      })
                      .andWhere('exclusions.itemId IS NULL')
                      .andWhere('prices.itemId IS NOT NULL')
                      .andWhere('salesConfigs.itemId IS NOT NULL')
                      .andWhere('item.id IS NOT NULL')
                      .andWhere('item.isActive = true')
                      .andWhere('item.entity = :entity', {
                        entity: identity.organization,
                      })
                      .andWhere('info.itemId IS NOT NULL');

                    if (isRetailS) {
                      if (
                        identity.division.dry?.isRetailS &&
                        identity.division.frozen?.isRetailS
                      ) {
                        productDetailSub.andWhere(
                          'retailConfigs.itemId IS NOT NULL',
                        );
                      } else if (identity.division.dry?.isRetailS) {
                        productDetailSub.andWhere(
                          `(retailConfigs.itemId IS NOT NULL OR info.type = 'FROZEN')`,
                        );
                      } else if (identity.division.frozen?.isRetailS) {
                        productDetailSub.andWhere(
                          `(retailConfigs.itemId IS NOT NULL OR info.type = 'DRY')`,
                        );
                      }
                    }
                  }),
                );
              }

              if (otherPages.length > 0) {
                // For other pages - no exclusion validation needed
                subSub.orWhere(
                  new Brackets((otherPagesSub) => {
                    otherPagesSub.where('banner.page IN (:...otherPages)', {
                      otherPages,
                    });
                  }),
                );
              }
            }),
          );
        }

        if (brandPages.length > 0) {
          sub.orWhere(
            new Brackets((subSub) => {
              subSub
                .where(`banner.page = '${BannerPage.BRAND}'`)
                .andWhere('info.brandId IS NOT NULL')
                .andWhere('info.categoryId IS NOT NULL')
                .andWhere(
                  new Brackets((qb) => {
                    qb.where(
                      `EXISTS (${this.getSubQuery(identity)
                        .andWhere('info.categoryId = item_info.categoryId')
                        .andWhere('info.brandId = item_info.brandId')
                        .getQuery()})`,
                    );
                  }),
                );
            }),
          );
        }

        if (categoryPages.length > 0) {
          sub.orWhere(
            new Brackets((subSub) => {
              subSub
                .where(`banner.page = '${BannerPage.CATEGORY}'`)
                .andWhere('info.categoryId IS NOT NULL')
                .andWhere(
                  new Brackets((qb) => {
                    qb.where(
                      `EXISTS (${this.getSubQuery(identity)
                        .andWhere('info.categoryId = item_info.categoryId')
                        .getQuery()})`,
                    );
                  }),
                );
            }),
          );
        }
      }),
    );

    const banners = await query
      .addSelect('banner')
      .addSelect([
        'item.id',
        'info.categoryId',
        'info.brandId',
        'info.type',
        'category.id',
        'categoryInfo.id',
        'categoryInfo.name',
        'categoryInfo.icon',
        'categoryInfo.image',
        'brand.id',
        'brand.description',
        'prices.itemId',
        'exclusions.itemId',
        'criteria.itemId',
        'promo.id',
        'promo.externalId',
        'promo.type',
      ])
      .cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:banners${bannerType}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      )
      .getMany();

    return {
      data: banners.map(this.toReadModel),
      metadata: {
        page,
        pageSize,
        totalCount: banners.length,
      },
    };
  }

  private toReadModel(entity: TypeOrmBannerEntity): BannerReadModel {
    let flashSaleId: Nullable<string> = null;
    let regularPromoId: Nullable<string> = null;

    const promoCriteria = entity.item?.promoCMSCriteria?.sort(
      (x, y) => x.sequence - y.sequence,
    );
    if (promoCriteria) {
      const flashSalePromo = promoCriteria.find(
        (criteria) => criteria.promo?.type === PromoTypes.FlashSale,
      );
      const regularPromo = promoCriteria.find(
        (criteria) => criteria.promo?.type === PromoTypes.Regular,
      );

      flashSalePromo && (flashSaleId = flashSalePromo.promo.externalId);
      regularPromo && (regularPromoId = regularPromo.promo.externalId);
    }
    return new BannerReadModel({
      id: EntityId.fromNumber(entity.id),
      name: entity.name,
      image: entity.image,
      productId: entity.item ? EntityId.fromString(entity.item.id) : null,
      productExternalId: entity.item?.externalId,
      brandId: entity.item?.info?.brandId || null,
      categoryId: entity.item?.info?.categoryId || null,
      page: entity.page,
      categoryName: entity.item?.info?.category?.info?.name || null,
      brandName: entity.item?.info?.brand?.description || null,
      categoryIcon: entity.item?.info?.category?.info?.icon || null,
      categoryImage: entity.item?.info?.category?.info?.image || null,
      type: entity.item?.info?.type,
      sequence: entity.seq,
      flashSaleId,
      regularPromoId,
    });
  }

  async getSuggestion(
    identity: UserIdentity,
  ): Promise<SuggestionBannerReadModel> {
    const [buyerInfo, suggestionBannerReshowConfig] = await Promise.all([
      this.dataSource
        .createQueryBuilder(TypeOrmBuyerInfoEntity, 'info')
        .where('info.buyerId = :buyerId', { buyerId: identity.id })
        .cache(
          CacheUtil.getCacheKey(`user:${identity.externalId}:buyer-info`),
          ms('1h'),
        )
        .getMany(),
      this.getSuggestionBannerReshowConfig(),
    ]);

    if (!buyerInfo.length)
      throw createBadRequestException('buyer-info-not-found');

    return new SuggestionBannerReadModel({
      buyerInfo,
      suggestionBannerReshowConfig,
    });
  }

  private async getSuggestionBannerReshowConfig(): Promise<
    Record<Division, number>
  > {
    const drySuggestion = this.parameterService.getOne(
      ParameterKeys.BANNER_SUGGESTION_DRY,
    );
    const frozenSuggestion = this.parameterService.getOne(
      ParameterKeys.BANNER_SUGGESTION_FROZEN,
    );

    return {
      [DivisionEnum.DRY]: drySuggestion
        ? Number(drySuggestion.value)
        : DEFAULT_SUGGESTION_BANNER_RESHOW_DAYS,
      [DivisionEnum.FROZEN]: frozenSuggestion
        ? Number(frozenSuggestion.value)
        : DEFAULT_SUGGESTION_BANNER_RESHOW_DAYS,
    };
  }
}
