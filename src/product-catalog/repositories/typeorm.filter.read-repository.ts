import { Brackets, DataSource, SelectQueryBuilder } from 'typeorm';

import { InjectDataSource } from '@nestjs/typeorm';
import { DivisionEnum } from '@wings-corporation/core';
import { Money, Percentage } from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import { PackQty, SalesItemPrice } from '@wings-online/cart/domains';
import {
  BaseReadRepository,
  SalesTier,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import {
  TypeOrmBestSellerEntity,
  TypeOrmBrandEntity,
  TypeOrmDestCodeEntity,
  TypeOrmItemInfoEntity,
  TypeOrmPromoTprDestCodeEntity,
  TypeOrmPromoTprEntity,
  TypeOrmPromoTprTargetBenefitEntity,
  TypeOrmPromoTprTargetEntity,
  TypeOrmRecommendationCsEntity,
  TypeOrmRecommendationSimilarEntity,
  TypeOrmRecommendationUsEntity,
} from '../entities';
import { TypeOrmCustItemHistoryEntity } from '../entities/typeorm.cust-item-history.entity';
import {
  GetFilterParams,
  GetFilterStateParams,
  IFilterReadRepository,
} from '../interfaces';
import {
  PRODUCT_DEFAULT_BASE_UOM,
  PackSizeUnit,
  ProductLabel,
  ProductType,
} from '../product-catalog.constants';
import {
  PromoTypes,
  TypeOrmPromoCMSCriteriaBenefitEntity,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoCMSEntity,
  TypeOrmPromoCMSTargetEntity,
  TypeOrmPromoCmsRedemptionEntity,
  UomTypeEnum,
} from '../promotion';
import {
  FilterReadModel,
  FilterState,
  HETParameter,
  HETRange,
  PackSize,
} from '../read-models';
import { PromoUtils } from '../utils/promo.util';

export class TypeOrmFilterReadRepository
  extends BaseReadRepository
  implements IFilterReadRepository
{
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly parameterService: ParameterService,
  ) {
    super();
  }

  private getBaseQuery(params: {
    identity: UserIdentity;
    withTPR?: boolean;
  }): SelectQueryBuilder<TypeOrmItemInfoEntity> {
    const { identity, withTPR } = params;
    const { dry, frozen } = identity.division;

    let cmsPromoTargetCondition = '';
    if (identity.division.dry) {
      cmsPromoTargetCondition += `
        (info.type = '${DivisionEnum.DRY}' 
          AND target.salesOffice = '${identity.division.dry.salesOffice}' 
          AND target.group = '${identity.division.dry.group}'
        )`;
    }
    if (identity.division.frozen) {
      if (cmsPromoTargetCondition) cmsPromoTargetCondition += ' OR ';
      cmsPromoTargetCondition += `
        (info.type = '${DivisionEnum.FROZEN}' 
          AND target.salesOffice = '${identity.division.frozen.salesOffice}' 
          AND target.group = '${identity.division.frozen.group}'
        )`;
    }

    const queryBuilder = this.dataSource
      .createQueryBuilder(TypeOrmItemInfoEntity, 'info')
      .leftJoinAndSelect('info.item', 'item')
      .leftJoinAndMapOne(
        'info.brand',
        TypeOrmBrandEntity,
        'brand',
        'info.brandId = brand.id',
      )
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        { excludeKeys: KeyUtil.getSalesExcludeKeys(identity) },
      )
      .innerJoinAndSelect(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndMapOne(
        'item.recommendationCs',
        TypeOrmRecommendationCsEntity,
        'recommendationCs',
        'CAST(item.externalId AS VARCHAR) = recommendationCs.externalId AND recommendationCs.buyerExternalId = :buyerExternalId',
        {
          buyerExternalId: identity.externalId,
        },
      )
      .leftJoinAndMapOne(
        'item.recommendationUs',
        TypeOrmRecommendationUsEntity,
        'recommendationUs',
        'CAST(item.externalId AS VARCHAR) = recommendationUs.externalId AND recommendationUs.buyerExternalId = :buyerExternalId',
        {
          buyerExternalId: identity.externalId,
        },
      )
      .leftJoinAndMapOne(
        'item.recommendationSimilar',
        TypeOrmRecommendationSimilarEntity,
        'recommendationSimilar',
        'CAST(item.externalId AS VARCHAR) = recommendationSimilar.externalId AND recommendationSimilar.buyerExternalId = :buyerExternalId',
        {
          buyerExternalId: identity.externalId,
        },
      )
      .leftJoinAndMapOne(
        'item.bestSeller',
        TypeOrmBestSellerEntity,
        'bestSeller',
        '(item.externalId)::varchar = bestSeller.material_id',
      )
      .leftJoinAndMapOne(
        'item.custItemHistory',
        TypeOrmCustItemHistoryEntity,
        'custItemHistory',
        '(item.externalId)::varchar = custItemHistory.material_id AND custItemHistory.buyerExternalId = :buyerExternalId',
        {
          buyerExternalId: identity.externalId,
        },
      );
    if (withTPR) {
      const prefixTargets = PromoUtils.getPromoTPRTargets(identity);
      const targets = PromoUtils.getPromoTPRTargets(identity, false);

      const lifetimePromoExternalType = this.parameterService.getOne(
        ParameterKeys.LIFETIME_PROMOTION_EXTERNAL_TYPE,
      )?.value;

      queryBuilder
        .leftJoinAndMapMany(
          'item.promoTPRTargets',
          TypeOrmPromoTprTargetEntity,
          'tprTarget',
          `item.id::text = tprTarget.item_id OR tprTarget.tag = ANY(salesConfigs.tags)`,
        )
        .leftJoinAndMapOne(
          'tprTarget.promo',
          TypeOrmPromoTprEntity,
          'tprPromo',
          `tprPromo.id = tprTarget.promoId`,
        )
        .andWhere('tprPromo.entity = :entity')
        .leftJoinAndMapMany(
          'tprPromo.destCodes',
          TypeOrmPromoTprDestCodeEntity,
          'tprDest',
          `tprPromo.id = tprDest.promoId`,
        )
        .leftJoinAndMapMany(
          'tprDest.destCodeInfo',
          TypeOrmDestCodeEntity,
          'tprDestInfo',
          `tprDestInfo.destCode = tprDest.destCode`,
        )
        .leftJoinAndMapOne(
          'tprTarget.benefit',
          TypeOrmPromoTprTargetBenefitEntity,
          'tprTargetBenefit',
          `tprTargetBenefit.promo_target_id = tprTarget.id`,
        );
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((qbWithOutDest) => {
              qbWithOutDest
                .where('tprTarget.salesOrg in (:...salesOrgs)', {
                  salesOrgs: prefixTargets.salesOrgs,
                })
                .andWhere('tprTarget.distChannel in (:...distChannels)', {
                  distChannels: prefixTargets.distChannels,
                })
                .andWhere('tprTarget.salesOffice in (:...salesOffices)', {
                  salesOffices: prefixTargets.salesOffices,
                })
                .andWhere('tprTarget.salesGroup in (:...salesGroups)', {
                  salesGroups: prefixTargets.salesGroups,
                })
                .andWhere('tprTarget.group in (:...groups)', {
                  groups: prefixTargets.groups,
                })
                .andWhere(
                  'tprTarget.buyerExternalId in (:...buyerExternalIds)',
                  {
                    buyerExternalIds: prefixTargets.buyerExternalIds,
                  },
                )
                .andWhere('tprDest.promoId is null')
                .andWhere('tprTarget.periodFrom <= now()')
                .andWhere('tprTarget.periodTo >= now()')
                .andWhere('tprPromo.useDestCode = false');
            }),
          ).orWhere(
            new Brackets((qbWithDest) => {
              qbWithDest
                .where('tprPromo.useDestCode = true')
                .andWhere('tprTarget.periodFrom <= now()')
                .andWhere('tprTarget.periodTo >= now()')
                .andWhere(
                  'tprDestInfo.salesOrgs && ARRAY[:...salesOrgsNonPrefix]::varchar[]',
                  { salesOrgsNonPrefix: targets.salesOrgs },
                )
                .andWhere(
                  'tprDestInfo.distChannels && ARRAY[:...distChannelsNonPrefix]::varchar[]',
                  { distChannelsNonPrefix: targets.distChannels },
                )
                .andWhere(
                  'tprDestInfo.divisions && ARRAY[:...divisionsNonPrefix]::varchar[]',
                  { divisionsNonPrefix: targets.divisions },
                )
                .andWhere(
                  'tprDestInfo.salesOffices && ARRAY[:...salesOfficesNonPrefix]::varchar[]',
                  { salesOfficesNonPrefix: targets.salesOffices },
                )
                .andWhere(
                  'tprDestInfo.salesGroups && ARRAY[:...salesGroupsNonPrefix]::varchar[]',
                  { salesGroupsNonPrefix: targets.salesGroups },
                )
                .andWhere(
                  'tprDestInfo.groups && ARRAY[:...groupsNonPrefix]::varchar[]',
                  {
                    groupsNonPrefix: targets.groups,
                  },
                )
                .andWhere(
                  'tprDestInfo.buyerExternalIds && ARRAY[:...buyerExternalIdsNonPrefix]::varchar[]',
                  { buyerExternalIdsNonPrefix: targets.buyerExternalIds },
                )
                .andWhere(
                  'tprDestInfo.hierarchies && ARRAY[:...hierarchiesNonPrefix]::varchar[] ',
                  { hierarchiesNonPrefix: targets.hierarchies },
                )
                .andWhere(
                  'NOT (:buyerExternalId = ANY(tprDestInfo.excludedBuyerExternalIds))',
                  {
                    buyerExternalId: identity.externalId,
                  },
                )
                .andWhere(
                  'NOT (ARRAY[:...groupsNonPrefix]::varchar[] && tprDestInfo.excludedGroups)',
                  { groupsNonPrefix: targets.groups },
                );
            }),
          );
        }),
      );

      lifetimePromoExternalType &&
        queryBuilder.andWhere(
          'tprPromo.external_type != :lifetimePromoExternalType',
          {
            lifetimePromoExternalType: lifetimePromoExternalType,
          },
        );
    }

    queryBuilder
      .leftJoinAndMapMany(
        'item.promoCMSCriteria',
        TypeOrmPromoCMSCriteriaEntity,
        'criteria',
        '(item.id)::varchar = (criteria.itemId)::varchar OR criteria.tag = ANY(salesConfigs.tags)',
      )
      .leftJoinAndMapOne(
        'criteria.promo',
        TypeOrmPromoCMSEntity,
        'promo',
        `criteria.promoId = promo.id AND (promo.organization in (:...organizations)) AND promo.periodTo >= now()`,
        {
          organizations: ['*', identity.organization],
        },
      )
      .leftJoinAndMapOne(
        'criteria.benefit',
        TypeOrmPromoCMSCriteriaBenefitEntity,
        'benefit',
        'benefit.promoCriteriaId = criteria.id',
      )
      .leftJoinAndMapMany(
        'promo.targets',
        TypeOrmPromoCMSTargetEntity,
        'target',
        `promo.id = target.promoId AND (${cmsPromoTargetCondition})`,
      )
      .leftJoinAndMapMany(
        'criteria.redemptions',
        TypeOrmPromoCmsRedemptionEntity,
        'redemptions',
        'redemptions.buyerId = :buyerId AND redemptions.promoCriteriaId = criteria.id',
        {
          buyerId: identity.id,
        },
      )
      .andWhere('item.isActive IS true')
      .andWhere('item.entity = :entity')
      .andWhere('exclusions.itemId IS NULL')
      .setParameter('entity', identity.organization);

    const dryOnly = dry && !frozen;
    const frozenOnly = !dry && frozen;

    if (dryOnly) {
      queryBuilder.andWhere('info.type = :productType', {
        productType: ProductType.DRY,
      });
    } else if (frozenOnly) {
      queryBuilder.andWhere('info.type = :productType', {
        productType: ProductType.FROZEN,
      });
    }

    const isRetailS = dry?.isRetailS || frozen?.isRetailS;

    if (isRetailS) {
      queryBuilder.leftJoin(
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
        queryBuilder.andWhere('retailConfigs.itemId IS NOT NULL');
      } else if (identity.division.dry?.isRetailS) {
        queryBuilder.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        queryBuilder.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR info.type = 'DRY')`,
        );
      }
    }

    return queryBuilder;
  }

  async getFilterState(
    identity: UserIdentity,
    params: GetFilterStateParams,
  ): Promise<FilterState> {
    const hetParameter = await this.getHETParameters();

    let query = this.getBaseQuery({ identity, withTPR: params.isTprPromo });
    query = this.addQueryCondition(query, identity, {
      categoryId: params.categoryId,
      isNew: params.isNew,
      isBestSeller: params.isBestSeller,
      isLowStock: params.isLowStock,
      isSelected: params.isSelected,
      isFrequentlyPurchased: params.isFrequentlyPurchased,
      isSimilar: params.isSimilar,
      itemIds: params.itemIds,
      isTprPromo: params.isTprPromo,
      isActiveFlashSale: params.isActiveFlashSale,
      isUpcomingFlashSale: params.isUpcomingFlashSale,
    });

    const rows = await query.getMany();
    let filtered: TypeOrmItemInfoEntity[] = rows;

    if (params.isTprPromo) {
      filtered = this.filterZeroDiscountPromotion(filtered);
    }

    // filter out item that reach max quota
    if (params.isActiveFlashSale || params.isUpcomingFlashSale) {
      filtered = this.filterRunOutFlashSale(filtered);
    }

    const state = new FilterState();

    for (const range of hetParameter.range) {
      state.addHetRange({ from: range.from, to: range.to }, range.label);
    }

    for (const row of filtered) {
      const price = row.item.prices
        ? SalesUtil.getEffectiveSalesPrice(
            row.item.prices.map((x) =>
              SalesItemPrice.create(
                SalesTier.create(x.tier),
                Money.create(x.price),
              ),
            ),
          )
        : Money.zero();
      const het = SalesUtil.convertPriceToHET(price, hetParameter.percentage);

      const label = new Array<ProductLabel>();

      if (row.item.bestSeller) {
        label.push(ProductLabel.BEST_SELLER);
      }

      if (row.item.custItemHistory) {
        label.push(ProductLabel.LOW_STOCK);
      }

      if (
        row.item.recommendationCs ||
        row.item.recommendationUs ||
        row.item.recommendationSimilar
      ) {
        label.push(ProductLabel.RECOMMENDED);
      }

      if (row.item.promoCMSCriteria.length > 0) {
        const isFlashSaleAvailable = row.item.promoCMSCriteria.find(
          (criteria) =>
            criteria.promo?.type === PromoTypes.FlashSale &&
            criteria.promo?.periodFrom <= new Date() &&
            criteria.promo?.targets.length,
        );

        const isPKWOAvailable = row.item.promoCMSCriteria.find(
          (criteria) =>
            criteria.promo?.type === PromoTypes.Regular &&
            criteria.promo?.periodFrom <= new Date() &&
            criteria.promo?.targets.length,
        );

        isFlashSaleAvailable && label.push(ProductLabel.FLASH_SALE);
        isPKWOAvailable && label.push(ProductLabel.APP_PROMOTION);
      }

      if (
        row.brand &&
        row.brandId &&
        row.variant &&
        row.packSize &&
        het.gt(Money.zero())
      ) {
        state.addItemSource({
          brandId: String(row.brandId),
          brandDescription: row.brand.description,
          variant: row.variant,
          size: row.packSize,
          het: het.value,
          label,
        });
      }
    }

    return state;
  }

  async getFilter(params: GetFilterParams): Promise<FilterReadModel> {
    const { identity, ...filterConditions } = params;

    let query = this.getBaseQuery({ identity });
    query = this.addQueryCondition(query, identity, filterConditions);

    const hetParameter = await this.getHETParameters();
    const filter = new FilterReadModel({
      brand: [],
      variant: [],
      hetRange: [],
      size: [],
      label: [],
      hetParameter: hetParameter,
    });

    const result = await query.getMany();

    result.forEach((row) => {
      row.variant && filter.addVariant(row.variant);
      row.brand &&
        filter.addBrand({
          id: row.brand.id,
          name: String(row.brand.description),
        });

      const size = row.packSize ? this.toSize(row.packSize) : undefined;
      size && filter.addSize(size);

      const price = row.item.prices
        ? SalesUtil.getEffectiveSalesPrice(
            row.item.prices.map((x) =>
              SalesItemPrice.create(
                SalesTier.create(x.tier),
                Money.create(x.price),
              ),
            ),
          )
        : Money.zero();
      const het = price
        ? this.getPriceHetRange(price, hetParameter)
        : undefined;

      if (het?.range) {
        if (!params.priceRange?.length) {
          filter.addHetRange(het.range);
        } else {
          for (const range of params.priceRange) {
            if (het.value >= range.from.value) {
              if (!range.to || het.value <= range.to.value) {
                filter.addHetRange(het.range);
                break;
              }
            }
          }
        }
      }

      row.item.bestSeller && filter.addLabel(ProductLabel.BEST_SELLER);
      row.item.custItemHistory && filter.addLabel(ProductLabel.LOW_STOCK);

      if (
        row.item.recommendationCs ||
        row.item.recommendationUs ||
        row.item.recommendationSimilar
      ) {
        filter.addLabel(ProductLabel.RECOMMENDED);
      }
    });

    return filter;
  }

  private addQueryCondition(
    qb: SelectQueryBuilder<TypeOrmItemInfoEntity>,
    identity: UserIdentity,
    params: GetFilterStateParams,
  ) {
    params.itemIds?.length &&
      qb.andWhere('item.id IN (:...itemIds)', {
        itemIds: params.itemIds,
      });
    params.categoryId &&
      qb.andWhere('info.categoryId = :categoryId', {
        categoryId: params.categoryId,
      });
    params.isFrequentlyPurchased &&
      qb.andWhere('recommendationUs.id IS NOT NULL');
    params.isSelected && qb.andWhere('recommendationCs.id IS NOT NULL');
    params.isSimilar && qb.andWhere('recommendationSimilar.id IS NOT NULL');
    params.isBestSeller && qb.andWhere('bestSeller.id IS NOT NULL');
    params.isLowStock &&
      qb.andWhere('custItemHistory.flagRedline = :flagRedline', {
        flagRedline: 'Y',
      });
    params.isNew && qb.andWhere('info.isNew = :isNew', { isNew: true });

    if (params.isActiveFlashSale || params.isUpcomingFlashSale) {
      qb.leftJoin(
        TypeOrmPromoCMSCriteriaEntity,
        'flashsaleCriteria',
        'flashsaleCriteria.itemId = (item.id)::varchar or flashsaleCriteria.tag = ANY(salesConfigs.tags)',
      )
        .leftJoin(
          TypeOrmPromoCMSEntity,
          'flashsale',
          `flashsaleCriteria.promoId = flashsale.id`,
        )
        .leftJoin(
          TypeOrmPromoCMSTargetEntity,
          'flashsaleTarget',
          `flashsale.id = flashsaleTarget.promoId`,
        )
        .addCommonTableExpression(
          `SELECT now()+(COALESCE(MIN(value), '2') || ' hours')::interval AS threshold FROM m_parameter WHERE parameter_id = 'upcoming_display_in_hour' LIMIT 1`,
          'cte',
        )
        .leftJoin('cte', 'fs_config', 'TRUE');

      qb.andWhere(
        new Brackets((sub) => {
          sub
            .andWhere(`flashsale.type = '${PromoTypes.FlashSale}'`)
            .andWhere(`flashsale.periodTo >= now()`)
            .andWhere('flashsale.organization in (:...organizations)')
            .andWhere(
              new Brackets((sub) => {
                const { dry, frozen } = identity.division;
                if (dry) {
                  sub.orWhere(
                    new Brackets((innner) => {
                      innner.andWhere('info.type = :dryType', {
                        dryType: DivisionEnum.DRY,
                      });
                      innner.andWhere(
                        'flashsaleTarget.salesOffice = :drySalesOffice',
                        {
                          drySalesOffice: dry.salesOffice,
                        },
                      );
                      innner.andWhere('flashsaleTarget.group = :dryGroup', {
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
                      innner.andWhere(
                        'flashsaleTarget.salesOffice = :frozenSalesOffice',
                        {
                          frozenSalesOffice: frozen.salesOffice,
                        },
                      );
                      innner.andWhere('flashsaleTarget.group = :frozenGroup', {
                        frozenGroup: frozen.group,
                      });
                    }),
                  );
                }
              }),
            );

          if (params.isActiveFlashSale) {
            sub.andWhere(`flashsale.periodFrom <= now()`);
          } else if (params.isUpcomingFlashSale) {
            sub.andWhere(
              `flashsale.periodFrom BETWEEN now() AND fs_config.threshold`,
            );
          }
        }),
      );
    }

    return qb;
  }

  public async getHETParameters(): Promise<HETParameter> {
    const parameter: HETParameter = {
      range: [],
      percentage: Percentage.zero(),
    };

    const range = this.parameterService.get(ParameterKeys.RANGE_HET);
    const percentage = this.parameterService.getOne(
      ParameterKeys.PERCENTAGE_HET,
    );

    const rangeValues: string[] = range ? range.map((r) => r.value) : [];
    if (percentage) {
      parameter.percentage = Percentage.create(
        parseFloat(percentage.value.split('%')[0]),
      );
    }

    const sortedRanges = rangeValues.sort((a, b) => {
      const getMinValue = (range: string) =>
        parseInt(range.split('-')[0].replace('>', '').replaceAll('.', ''), 10);
      return getMinValue(a) - getMinValue(b);
    });

    sortedRanges.forEach((range, idx) => {
      const current = range.replaceAll('.', '');

      const prev = sortedRanges[idx - 1]?.replaceAll('.', '');
      const prevEnd = prev
        ? parseInt(prev.includes('-') ? prev.split('-')[1] : prev)
        : undefined;
      const currentStart = parseInt(current.split('-')[0].replace('>', ''));
      const isFromInclusive = !current.includes('>');

      const next = sortedRanges[idx + 1]?.replaceAll('.', '');
      const nextStart = next
        ? parseInt(next.split('-')[0].replace('>', ''))
        : undefined;
      const currentEnd = next
        ? parseInt(current.includes('-') ? current.split('-')[1] : current)
        : undefined;
      const isToInclusive = !next || next.includes('>');

      parameter.range.push({
        from:
          (prevEnd ? (prevEnd + currentStart) / 2 : 0) +
          (isFromInclusive ? 0 : 1),
        to:
          currentEnd && nextStart
            ? (currentEnd + nextStart) / 2 - (isToInclusive ? 0 : 1)
            : undefined,
        label: range,
      });
    });

    return parameter;
  }

  private getPriceHetRange(
    price: Money,
    hetParams: HETParameter,
  ): { value: number; range?: HETRange } {
    const hetPrice = SalesUtil.convertPriceToHET(
      price,
      hetParams.percentage,
    ).value;
    const range = hetParams.range.find((range) => {
      if (range.to) {
        return hetPrice >= range.from && hetPrice <= range.to;
      }
      return hetPrice >= range.from;
    });
    return {
      value: hetPrice,
      range,
    };
  }

  private toSize(packSize: string): PackSize | undefined {
    const match = packSize.match(/^(\d+)\s*([a-zA-Z]+)$/);
    if (match) {
      return {
        value: parseInt(match[1], 10),
        unit: match[2] as PackSizeUnit,
        label: packSize,
      };
    }
    return undefined;
  }

  private filterZeroDiscountPromotion(items: TypeOrmItemInfoEntity[]) {
    return items.filter((row) => {
      let effectivePromo: TypeOrmPromoTprTargetEntity[] = [];
      row.item.promoTPRTargets?.map((x) => {
        const samePriorityPromoIdx = effectivePromo.findIndex(
          (y) => x.promo.priority === y.promo.priority,
        );
        if (
          samePriorityPromoIdx !== -1 &&
          x.priority < effectivePromo[samePriorityPromoIdx].priority
        ) {
          effectivePromo[samePriorityPromoIdx] = x;
        } else if (samePriorityPromoIdx === -1) {
          effectivePromo.push(x);
        }
      });

      effectivePromo = effectivePromo.filter(
        (promo) =>
          !(
            promo.type === 'DIRECT' &&
            (!promo.benefit ||
              (promo.benefit.value === 0 && !promo.benefit.freeItemId))
          ),
      );
      return !!effectivePromo.length;
    });
  }

  private filterRunOutFlashSale(
    items: TypeOrmItemInfoEntity[],
  ): TypeOrmItemInfoEntity[] {
    return items.filter((row) => {
      const baseUom = SalesUtil.getEffectiveBaseUom(
        row.item.baseUom || PRODUCT_DEFAULT_BASE_UOM,
        row.item.uoms?.map((x) => ({
          tier: SalesTier.create(x.tier),
          name: x.uom,
          qty: PackQty.create(x.packQty),
        })) || [],
      );
      const flashSale = row.item.promoCMSCriteria.find(
        (criteria) =>
          criteria.promo?.type === PromoTypes.FlashSale &&
          criteria.promo?.periodFrom <= new Date() &&
          criteria.promo?.targets.length,
      );

      if (flashSale) {
        const { benefit } = flashSale;
        let maxQtyInBase: number | undefined;
        if (benefit.maxQtyUomType === UomTypeEnum.PACK) {
          maxQtyInBase = benefit.maxQty! * (row.item.packQty ?? 1);
        } else if (benefit.maxQtyUomType === UomTypeEnum.INTERMEDIATE) {
          maxQtyInBase = benefit.maxQty! * baseUom.qty.value;
        } else {
          maxQtyInBase = benefit.maxQty!;
        }
        const usedQuota = flashSale.redemptions.reduce(
          (total, item) => total + item.qty,
          0,
        );

        return usedQuota < maxQtyInBase;
      }

      return true;
    });
  }
}
