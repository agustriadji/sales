import { uniq } from 'lodash';
import { Brackets, DataSource, SelectQueryBuilder } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DivisionEnum, Nullable } from '@wings-corporation/core';
import {
  EntityId,
  Money,
  Percentage,
  Quantity,
} from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import {
  CoinType,
  DiscountType,
  PromoTPRTypeEnum,
  SALES_ITEM_WRITE_REPOSITORY,
  UomType,
  UomTypeEnum,
} from '@wings-online/app.constants';
import {
  PackQty,
  SalesItemUomReadModel,
  Tag,
} from '@wings-online/cart/domains';
import {
  TypeOrmItemEntity,
  TypeOrmItemSalesConfigEntity,
} from '@wings-online/cart/entities';
import { ISalesItemWriteRepository } from '@wings-online/cart/interfaces';
import {
  FlashSalePromo,
  FlashSalePromoCondition,
  GetPromotionFilter,
  GetTPRPromotionItem,
  IPromoReadRepository,
  LegacyLoyaltyStatus,
  LoyaltyPromo,
  LoyaltyPromoCondition,
  LoyaltyPromoCriteria,
  PromoBenefit,
  PromoPriorityTypes,
  PromoTypes,
  RegularPromo,
  RegularPromoCondition,
  TprDirectPromo,
  TprDirectPromoCondition,
  TprPromo,
  TprStrataPromo,
  TprStrataPromoCondition,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoLoyaltyEntity,
  TypeOrmPromoTPREntity,
  TypeOrmPromoTPRTagCriteriaEntity,
} from '@wings-online/cart/promotion';
import {
  BenefitType,
  CoinBenefit,
  DiscountBenefit,
  ISalesUom,
  MinimumPurchaseAmountCriterion,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
  ProductBenefit,
  PurchaseAmountBetweenCriterion,
  PurchaseQtyBetweenCriterion,
  SalesTier,
  SalesUtil,
  TagCriteria,
  Uom,
  UserIdentity,
} from '@wings-online/common';
import { PurchaseQtyBetweenByTagCriterion } from '@wings-online/common/criterion/purchase-qty-between-by-tag.criterion';
import { TypeOrmProductHelperRepository } from '@wings-online/product-catalog/repositories/typeorm.product-helper.repository';
import { PromoUtils } from '@wings-online/product-catalog/utils/promo.util';

interface IPromoBenefit {
  discountType?: DiscountType;
  discountValue?: number;
  coinType?: CoinType;
  coinValue?: number;
  scaleQty?: number;
  scaleUomType?: UomType;
  freeItem?: IFreeItem;
  maxQty?: number;
  maxUomType?: UomType;
}

interface IFreeItem {
  item: SalesItemUomReadModel;
  qty?: number;
  uomType?: UomType;
}

@Injectable()
export class TypeOrmPromoReadRepository implements IPromoReadRepository {
  private readonly productHelperRepository: TypeOrmProductHelperRepository;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(SALES_ITEM_WRITE_REPOSITORY)
    private readonly salesItemRepository: ISalesItemWriteRepository,
  ) {
    this.productHelperRepository = new TypeOrmProductHelperRepository(
      dataSource,
    );
  }

  async getItemFlashSale(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<FlashSalePromo[]> {
    const query = this.getFlashSaleBaseQuery(identity)
      .andWhere('criteria.itemId in (:...itemIds)', {
        itemIds: itemIds.concat('*'),
      })
      .andWhere(`promo.periodFrom <= now()`)
      .andWhere(`promo.periodTo >= now()`);

    const promoItems = await query.getMany();

    return promoItems.map((x) => {
      const promoCriteria = x.promoCMSCriteria[0];
      const { promo, redemptions } = promoCriteria;

      return {
        id: EntityId.fromString(promo.id),
        code: promo.externalId,
        type: 'FLS',
        itemId:
          promoCriteria.tag === '*'
            ? EntityId.fromString(promoCriteria.itemId)
            : '*',
        tag:
          promoCriteria.tag !== '*'
            ? Tag.fromString(promoCriteria.tag)
            : undefined,
        priority: PromoPriorityTypes.MAX_PRIORITY,
        condition: this.mapCmsPromotionCondition(x) as FlashSalePromoCondition,
        redeemedQty: redemptions.reduce<Quantity>((acc, r) => {
          return acc.add(Quantity.create(r.qty));
        }, Quantity.zero()),
        startAt: promo.periodFrom,
        endAt: promo.periodTo,
      };
    });
  }

  async getItemNearestUpcomingFlashSale(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<FlashSalePromo | undefined> {
    const promoItem = await this.getFlashSaleBaseQuery(identity)
      .addCommonTableExpression(
        `SELECT now()+(COALESCE(MIN(value), '2') || ' hours')::interval AS threshold FROM m_parameter WHERE parameter_id = 'upcoming_display_in_hour' LIMIT 1`,
        'cte',
      )
      .leftJoin('cte', 'fs_config', 'TRUE')
      .andWhere('criteria.itemId in (:...itemIds)', {
        itemIds: itemIds.concat('*'),
      })
      .andWhere(`promo.periodFrom BETWEEN now() AND fs_config.threshold`)
      .andWhere(`promo.periodTo >= now()`)
      .orderBy('promo.periodFrom', 'ASC')
      .getOne();

    if (!promoItem) return;

    const promoCriteria = promoItem.promoCMSCriteria[0];
    const { promo, redemptions } = promoCriteria;

    return {
      id: EntityId.fromString(promo.id),
      code: promo.externalId,
      type: 'FLS',
      itemId: EntityId.fromString(promoCriteria.itemId),
      priority: -999,
      condition: this.mapCmsPromotionCondition(
        promoItem,
      ) as FlashSalePromoCondition,
      redeemedQty: redemptions.reduce<Quantity>((acc, r) => {
        return acc.add(Quantity.create(r.qty));
      }, Quantity.zero()),
      startAt: promo.periodFrom,
      endAt: promo.periodTo,
    };
  }

  private getFlashSaleBaseQuery(
    identity: UserIdentity,
  ): SelectQueryBuilder<TypeOrmItemEntity> {
    return this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoin('item.info', 'info')
      .innerJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .innerJoinAndMapMany(
        'item.promoCMSCriteria',
        TypeOrmPromoCMSCriteriaEntity,
        'criteria',
        '(item.id)::varchar = (criteria.itemId)::varchar OR criteria.tag = ANY(salesConfigs.tags)',
      )
      .innerJoinAndSelect('criteria.promo', 'promo')
      .innerJoin('promo.targets', 'target')
      .innerJoinAndSelect('criteria.benefit', 'benefit')
      .leftJoinAndSelect(
        'criteria.redemptions',
        'redemptions',
        'redemptions.buyerId = :buyerId',
        {
          buyerId: identity.id,
        },
      )
      .andWhere('promo.type = :promoType', {
        promoType: PromoTypes.FlashSale,
      })
      .andWhere('promo.organization in (:...orgIds)', {
        orgIds: ['*', identity.organization],
      })
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

  async getItemRegularPromotions(
    identity: UserIdentity,
    itemIds: string[],
    tags: string[],
  ): Promise<RegularPromo[]> {
    const query = this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoin('item.info', 'info')
      .innerJoin(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...salesConfigsKeys)',
        {
          salesConfigsKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .innerJoinAndMapMany(
        'item.promoCMSCriteria',
        TypeOrmPromoCMSCriteriaEntity,
        'criteria',
        '(item.id)::varchar = (criteria.itemId)::varchar OR criteria.tag = ANY(salesConfigs.tags)',
      )
      .innerJoinAndSelect('criteria.promo', 'promo')
      .innerJoin('promo.targets', 'target')
      .innerJoinAndSelect('criteria.benefit', 'benefit')
      .andWhere('promo.type = :promoType', {
        promoType: PromoTypes.Regular,
      })
      .andWhere('promo.organization in (:...orgIds)', {
        orgIds: ['*', identity.organization],
      })
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
      )
      .andWhere('criteria.itemId IN (:...itemIds)', {
        itemIds: itemIds.concat('*'),
      })
      .andWhere('criteria.tag IN (:...tags)', {
        tags: tags.concat('*'),
      })
      .andWhere(`promo.periodFrom <= now()`)
      .andWhere(`promo.periodTo >= now()`);

    const promoItems = await query.getMany();

    return promoItems.map((x) => {
      const promoCriteria = x.promoCMSCriteria[0];
      const { promo } = promoCriteria;

      return {
        id: EntityId.fromString(promo.id),
        code: promo.externalId,
        type: 'REG',
        itemId:
          promoCriteria.itemId != '*'
            ? EntityId.fromString(promoCriteria.itemId)
            : '*',
        priority: PromoPriorityTypes.MIN_PRIORITY,
        condition: this.mapCmsPromotionCondition(x) as RegularPromoCondition,
        tag:
          promoCriteria.tag != '*'
            ? Tag.fromString(promoCriteria.tag)
            : undefined,
      };
    });
  }

  async getLoyaltyPromo(
    identity: UserIdentity,
  ): Promise<LoyaltyPromo | undefined> {
    let promo: LoyaltyPromo | undefined;

    const { dry, frozen } = identity.division;

    const entity = await this.dataSource
      .createQueryBuilder(TypeOrmPromoLoyaltyEntity, 'loyalty')
      .innerJoin('loyalty.targets', 'targets')
      .where('targets.salesOffice in (:...keys)', {
        keys: new Array()
          .concat(dry ? dry.salesOffice : [])
          .concat(frozen ? frozen.salesOffice : []),
      })
      .andWhere('targets.group in (:...groups)', {
        groups: new Array()
          .concat(dry ? dry.group : [])
          .concat(frozen ? frozen.group : []),
      })
      .andWhere('loyalty.periodFrom <= now()')
      .andWhere('loyalty.periodTo >= now()')
      .andWhere('loyalty.status = :status', {
        status: 'Active' as LegacyLoyaltyStatus,
      })
      .getOne();

    if (entity) {
      const criteria: LoyaltyPromoCriteria = {
        criterion: MinimumPurchaseAmountCriterion.create(
          entity.minPurchaseAmount,
        ),
        benefit: {
          coin:
            entity.benefitType === 'COIN'
              ? {
                  type: 'AMOUNT',
                  value: Money.create(entity.benefitValue),
                }
              : undefined,
          creditMemo:
            entity.benefitType === 'CREDIT_MEMO'
              ? {
                  type: 'AMOUNT',
                  value: Money.create(entity.benefitValue),
                }
              : undefined,
        },
      };
      const condition: LoyaltyPromoCondition = {
        type: 'OneOf',
        criteria: [criteria],
      };
      promo = {
        id: EntityId.fromString(entity.id),
        type: 'LYL',
        condition,
      };
    }

    return promo;
  }

  async getItemTPRPromotions(
    identity: UserIdentity,
    items: GetTPRPromotionItem[],
    filter?: GetPromotionFilter,
  ): Promise<TprPromo[]> {
    if (items.length === 0) return [];
    const { dry, frozen } = identity.division;

    const itemIds = items.map((item) => item.id);
    const tags = uniq(items.flatMap((item) => item.tags));

    const prefixTargets = PromoUtils.getPromoTPRTargets(identity);
    const targets = PromoUtils.getPromoTPRTargets(identity, false);

    const promoQuery = this.dataSource
      .createQueryBuilder(TypeOrmPromoTPREntity, 'promo')
      .innerJoinAndSelect('promo.targets', 'target')
      .leftJoin('promo.destCodes', 'pdc')
      .leftJoinAndSelect('promo.tagCriteria', 'tagCriteria')
      .leftJoinAndSelect('target.benefit', 'targetBenefit')
      .leftJoinAndSelect(
        'targetBenefit.freeItem',
        'item',
        'item.isActive = true AND item.entity = :entity',
        { entity: identity.organization },
      )
      .leftJoinAndSelect('item.info', 'info', 'info.type in (:...types)', {
        types: new Array()
          .concat(dry ? DivisionEnum.DRY : [])
          .concat(frozen ? DivisionEnum.FROZEN : []),
      })
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...salesUomKeys)',
        {
          salesUomKeys: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...configKeys)',
        {
          configKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .leftJoinAndSelect('target.criteria', 'criteria')
      .leftJoinAndSelect('criteria.benefit', 'criteriaBenefit')
      .where('promo.useDestCode is false')
      .andWhere('promo.entity = :entity', { entity: identity.organization })
      .andWhere('target.salesOrg in (:...salesOrgs)', {
        salesOrgs: prefixTargets.salesOrgs,
      })
      .andWhere('target.distChannel in (:...distChannels)', {
        distChannels: prefixTargets.distChannels,
      })
      .andWhere('target.salesOffice in (:...salesOffices)', {
        salesOffices: prefixTargets.salesOffices,
      })
      .andWhere('target.salesGroup in (:...salesGroups)', {
        salesGroups: prefixTargets.salesGroups,
      })
      .andWhere('target.group in (:...groups)', {
        groups: prefixTargets.groups,
      })
      .andWhere('target.buyerExternalId in (:...buyerExternalIds)', {
        buyerExternalIds: targets.buyerExternalIds,
      })
      .andWhere('target.periodFrom <= now()')
      .andWhere('target.periodTo >= now()')
      .andWhere('target.itemId in (:...ids)', {
        ids: ['*'].concat(itemIds),
      })
      .andWhere('target.tag in (:...tags)', {
        tags: ['*'].concat(tags),
      });
    const promoDestCodeQuery = this.dataSource
      .createQueryBuilder(TypeOrmPromoTPREntity, 'promo')
      .innerJoinAndSelect('promo.targets', 'target')
      .innerJoin('promo.destCodes', 'pdc')
      .leftJoinAndSelect('promo.tagCriteria', 'tagCriteria')
      .innerJoin(
        'pdc.destCodeInfo',
        'dci',
        `dci.salesOrgs && ARRAY[:...salesOrgsNonPrefix]::varchar[] 
          AND dci.distChannels && ARRAY[:...distChannelsNonPrefix]::varchar[] 
          AND dci.divisions && ARRAY[:...divisionsNonPrefix]::varchar[] 
          AND dci.salesOffices && ARRAY[:...salesOfficesNonPrefix]::varchar[] 
          AND dci.salesGroups && ARRAY[:...salesGroupsNonPrefix]::varchar[] 
          AND dci.groups && ARRAY[:...groupsNonPrefix]::varchar[] 
          AND dci.buyerExternalIds && ARRAY[:...buyerExternalIdsNonPrefix]::varchar[] 
          AND dci.hierarchies && ARRAY[:...hierarchiesNonPrefix]::varchar[] 
          AND NOT (:buyerExternalId = ANY(dci.excludedBuyerExternalIds))
          AND NOT (ARRAY[:...groupsNonPrefix]::varchar[] && dci.excludedGroups)`,
        {
          salesOrgsNonPrefix: targets.salesOrgs,
          distChannelsNonPrefix: targets.distChannels,
          divisionsNonPrefix: targets.divisions,
          salesOfficesNonPrefix: targets.salesOffices,
          salesGroupsNonPrefix: targets.salesGroups,
          groupsNonPrefix: targets.groups,
          buyerExternalIdsNonPrefix: targets.buyerExternalIds,
          hierarchiesNonPrefix: targets.hierarchies,
        },
      )
      .leftJoinAndSelect('target.benefit', 'targetBenefit')
      .leftJoinAndSelect(
        'targetBenefit.freeItem',
        'item',
        'item.isActive = true AND item.entity = :entity',
        { entity: identity.organization },
      )
      .leftJoinAndSelect('item.info', 'info', 'info.type in (:...types)', {
        types: new Array()
          .concat(dry ? DivisionEnum.DRY : [])
          .concat(frozen ? DivisionEnum.FROZEN : []),
      })
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...salesUomKeys)',
        {
          salesUomKeys: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.prices',
        'prices',
        'prices.priceKey in (:...priceKeys) AND prices.validFrom <= now() AND prices.validTo >= now()',
        {
          priceKeys: KeyUtil.getSalesPriceKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...configKeys)',
        {
          configKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .leftJoinAndSelect('target.criteria', 'criteria')
      .leftJoinAndSelect('criteria.benefit', 'criteriaBenefit')
      .where('promo.useDestCode = true')
      .andWhere('target.salesOrg in (:...salesOrgs)')
      .andWhere('target.distChannel in (:...distChannels)')
      .andWhere('target.salesOffice in (:...salesOffices)')
      .andWhere('target.salesGroup in (:...salesGroups)')
      .andWhere('target.group in (:...groups)')
      .andWhere('target.buyerExternalId in (:...buyerExternalIds)')
      .andWhere('target.periodFrom <= now()')
      .andWhere('target.periodTo >= now()')
      .andWhere('target.itemId in (:...ids)', {
        ids: ['*'].concat(itemIds),
      })
      .andWhere('target.tag in (:...tags)', {
        tags: ['*'].concat(tags),
      })
      .andWhere('promo.entity = :entity', { entity: identity.organization })
      .setParameters({
        salesOrgs: prefixTargets.salesOrgs,
        distChannels: prefixTargets.distChannels,
        divisions: prefixTargets.divisions,
        salesOffices: prefixTargets.salesOffices,
        salesGroups: prefixTargets.salesGroups,
        groups: prefixTargets.groups,
        buyerExternalId: identity.externalId,
        buyerExternalIds: prefixTargets.buyerExternalIds,
        hierarchies: prefixTargets.hierarchies,
      });

    if (filter?.freeProductOnly) {
      promoQuery
        .andWhere('targetBenefit.freeItemId IS NOT NULL')
        .andWhere('targetBenefit.promoTargetId IS NOT NULL');
      promoDestCodeQuery
        .andWhere('targetBenefit.freeItemId IS NOT NULL')
        .andWhere('targetBenefit.promoTargetId IS NOT NULL');
    }

    const isSalesRetail = SalesUtil.isRetailS(identity);
    if (isSalesRetail) {
      promoQuery.leftJoinAndSelect(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
      promoDestCodeQuery.leftJoinAndSelect(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
    }

    const [promosWithoutDestCodes, promosWithValidDestCodes] =
      await Promise.all([promoQuery.getMany(), promoDestCodeQuery.getMany()]);

    const allPromos = promosWithoutDestCodes.concat(promosWithValidDestCodes);

    const freeProductIds: string[] = [];
    for (const promo of allPromos) {
      for (const target of promo.targets) {
        if (target.benefit?.freeItemId) {
          freeProductIds.push(target.benefit.freeItemId);
        }
      }
    }

    let products: SalesItemUomReadModel[] = [];
    if (freeProductIds.length > 0) {
      products = await this.salesItemRepository.getItemsUoms(
        freeProductIds,
        identity,
      );
    }

    const promotions: TprPromo[] = [];
    for (const data of allPromos) {
      let tagCriteria: TagCriteria | undefined;
      if (data.tagCriteria) {
        tagCriteria = await this.mapToTagCriteria(data.tagCriteria, identity);

        if (!tagCriteria) continue;
      }

      for (const target of data.targets) {
        if (target.type === 'DIRECT') {
          const benefit = target.benefit;
          if (!benefit) continue;

          // checking valid free item
          if (
            benefit.freeItemId &&
            (!benefit.freeItem ||
              !benefit.freeItem.info ||
              !benefit.freeItem.salesConfigs?.length ||
              !benefit.freeItem.prices?.length ||
              benefit.freeItem.exclusions?.length ||
              (isSalesRetail && !benefit.freeItem.retailConfigs?.length))
          ) {
            // skipping
            continue;
          }

          let intermediateUom: Nullable<Uom> = null;
          if (benefit.freeItem?.uoms?.length) {
            const intermediate = SalesUtil.getEffectiveBaseUom(
              '',
              benefit.freeItem.uoms.map((x) => ({
                tier: SalesTier.create(x.tier),
                name: x.uom,
                qty: PackQty.create(x.packQty),
              })),
            );

            intermediateUom = {
              name: intermediate.name,
              packQty: intermediate.qty,
            };
          }

          const condition: TprDirectPromoCondition = {
            id: EntityId.fromString(target.id),
            type: 'AllOf',
            criteria: [
              {
                criterion:
                  target.tag !== '*'
                    ? MinimumPurchaseQtyByTagCriterion.create(
                        target.tag,
                        data.tagCriteria?.tagMinQty || 1,
                        data.tagCriteria?.tagMinUomType || UomTypeEnum.BASE,
                        tagCriteria
                          ? {
                              ...tagCriteria,
                              isItemHasMatchingTag: target.itemId === '*',
                            }
                          : undefined,
                      )
                    : MinimumPurchaseQtyCriterion.create(1),
              },
            ],
            benefit: this.mapTPRBenefitToPromoBenefit({
              ...benefit,
              scaleQty: target.scaleQty,
              scaleUomType: target.scaleUomType,
              freeItem:
                benefit.freeItemId && benefit.freeItem
                  ? {
                      item: new SalesItemUomReadModel({
                        id: EntityId.fromString(benefit.freeItemId),
                        externalId: benefit.freeItem.externalId,
                        name: benefit.freeItem.info.name,
                        imageUrl: benefit.freeItem.info.imageUrl,
                        base: {
                          uom: benefit.freeItem.baseUom,
                          contains: PackQty.create(1),
                        },
                        intermediate: intermediateUom
                          ? {
                              uom: intermediateUom.name,
                              contains: intermediateUom.packQty,
                            }
                          : null,
                        pack:
                          benefit.freeItem.packUom && benefit.freeItem.packQty
                            ? {
                                uom: benefit.freeItem.packUom,
                                contains: PackQty.create(
                                  benefit.freeItem.packQty,
                                ),
                              }
                            : null,
                      }),
                      qty: benefit.freeItemQty,
                      uomType: benefit.freeItemUomType,
                    }
                  : undefined,
            }),
            scaleUomType: target.scaleUomType,
            priority: target.priority,
            scaleQty: Quantity.create(target.scaleQty),
          };
          const promotion: TprDirectPromo = {
            id: EntityId.fromString(data.id),
            itemId:
              target.itemId === '*'
                ? target.itemId
                : EntityId.fromString(target.itemId),
            tag: target.tag !== '*' ? Tag.fromString(target.tag) : undefined,
            type: 'TPR',
            code: data.externalId,
            externalType: data.externalType,
            priority: data.priority,
            condition,
            tagCriteria: tagCriteria
              ? {
                  ...tagCriteria,
                  isItemHasMatchingTag: target.itemId === '*',
                }
              : undefined,
          };

          promotions.push(promotion);
        } else {
          const criteria = target.criteria.filter((c) => c.benefit);
          if (criteria.length === 0) continue;

          const condition: TprStrataPromoCondition = {
            id: EntityId.fromString(target.id),
            type: 'OneOf',
            criteria: [],
            scaleQty: Quantity.create(target.scaleQty),
            scaleUomType: target.scaleUomType,
            priority: target.priority,
          };

          if (criteria[0].minQty !== undefined && !criteria[0].minPurchase) {
            const item = items.find(
              (item) =>
                item.id === target.itemId || item.tags.includes(target.tag),
            );

            if (!item) {
              continue;
            }

            const uomConversion = {
              base: Quantity.create(item.baseQty),
              pack: Quantity.create(item.packQty),
            };

            const sortedCriteria = criteria
              .map((c) => ({
                ...c,
                minQty: SalesUtil.convertQtyToBaseQty(
                  c.minQty,
                  c.minQtyUomType,
                  uomConversion,
                ).value,
                minQtyUomType: UomTypeEnum.BASE,
              }))
              .sort((a, b) => a.minQty - b.minQty);

            sortedCriteria.forEach((criterion, index) => {
              condition.criteria.push({
                criterion: sortedCriteria[index + 1]
                  ? target.tag !== '*'
                    ? PurchaseQtyBetweenByTagCriterion.create(
                        target.tag,
                        criterion.minQty,
                        sortedCriteria[index + 1].minQty - 1,
                        criterion.minQtyUomType as UomType,
                        tagCriteria
                          ? {
                              ...tagCriteria,
                              isItemHasMatchingTag: target.itemId === '*',
                            }
                          : undefined,
                      )
                    : PurchaseQtyBetweenCriterion.create(
                        criterion.minQty,
                        sortedCriteria[index + 1].minQty - 1,
                        criterion.minQtyUomType as UomType,
                      )
                  : target.tag !== '*'
                  ? MinimumPurchaseQtyByTagCriterion.create(
                      target.tag,
                      criterion.minQty,
                      criterion.minQtyUomType as UomType,
                      tagCriteria
                        ? {
                            ...tagCriteria,
                            isItemHasMatchingTag: target.itemId === '*',
                          }
                        : undefined,
                    )
                  : MinimumPurchaseQtyCriterion.create(
                      criterion.minQty,
                      criterion.minQtyUomType as UomType,
                    ),
                benefit: this.mapTPRBenefitToPromoBenefit({
                  ...criterion.benefit,
                  scaleQty: target.scaleQty,
                  scaleUomType: target.scaleUomType,
                }),
              });
            });
          } else if (criteria[0].minPurchase && target.itemId !== '*') {
            const sortedCriteria = criteria.sort(
              (a, b) => a.minPurchase - b.minPurchase,
            );
            sortedCriteria.forEach((criterion, index) => {
              condition.criteria.push({
                criterion: sortedCriteria[index + 1]
                  ? PurchaseAmountBetweenCriterion.create(
                      criterion.minPurchase,
                      sortedCriteria[index + 1].minPurchase,
                    )
                  : MinimumPurchaseAmountCriterion.create(
                      criterion.minPurchase,
                    ),
                benefit: this.mapTPRBenefitToPromoBenefit({
                  ...criterion.benefit,
                  scaleQty: target.scaleQty,
                  scaleUomType: target.scaleUomType,
                }),
              });
            });
          }

          const promotion: TprStrataPromo = {
            id: EntityId.fromString(data.id),
            itemId:
              target.itemId === '*'
                ? target.itemId
                : EntityId.fromString(target.itemId),
            tag: target.tag !== '*' ? Tag.fromString(target.tag) : undefined,
            type: 'TPR',
            code: data.externalId,
            externalType: data.externalType,
            priority: data.priority,
            condition,
            tagCriteria,
          };
          promotions.push(promotion);
        }
      }
    }

    return promotions;
  }

  async getFreeProductsPromotions(
    identity: UserIdentity,
    productIds: string[],
  ): Promise<TprPromo[]> {
    const targets = PromoUtils.getPromoTPRTargets(identity);
    const tags = await this.getTags(identity, productIds);
    const freeProductPromos = await this.dataSource
      .createQueryBuilder(TypeOrmPromoTPREntity, 'promo')
      .innerJoinAndSelect('promo.targets', 'target')
      .leftJoin('promo.destCodes', 'pdc')
      .innerJoinAndSelect('target.benefit', 'benefit')
      .where('pdc IS NULL')
      .andWhere('promo.entity = :entity', { entity: identity.organization })
      .andWhere('promo.type = :type', { type: PromoTPRTypeEnum.DIRECT })
      .andWhere('target.salesOrg in (:...salesOrgs)', {
        salesOrgs: targets.salesOrgs,
      })
      .andWhere('target.distChannel in (:...distChannels)', {
        distChannels: targets.distChannels,
      })
      .andWhere('target.salesOffice in (:...salesOffices)', {
        salesOffices: targets.salesOffices,
      })
      .andWhere('target.salesGroup in (:...salesGroups)', {
        salesGroups: targets.salesGroups,
      })
      .andWhere('target.group in (:...groups)', { groups: targets.groups })
      .andWhere('target.buyerExternalId in (:...buyerExternalIds)', {
        buyerExternalIds: targets.buyerExternalIds,
      })
      .andWhere('target.periodFrom <= now()')
      .andWhere('target.periodTo >= now()')
      .andWhere('target.itemId in (:...ids)', {
        ids: ['*'].concat(productIds),
      })
      .andWhere('target.tag in (:...tags)', {
        tags: ['*'].concat(uniq(tags)),
      })
      .andWhere('target.scaleQty IS NOT NULL')
      .andWhere('target.scaleUomType IS NOT NULL')
      .andWhere('benefit.freeItemId IS NOT NULL')
      .andWhere('benefit.freeItemQty IS NOT NULL')
      .andWhere('benefit.freeItemUomType IS NOT NULL')
      .getMany();

    const freeProductIds = freeProductPromos
      .map((x) => x.targets)
      .flat()
      .filter((t) => t.benefit.freeItemId)
      .map((t) => t.benefit.freeItemId!);

    let products: SalesItemUomReadModel[] = [];
    if (freeProductIds.length > 0) {
      products = await this.salesItemRepository.getItemsUoms(
        freeProductIds,
        identity,
      );
    }

    const promotions: TprPromo[] = [];
    for (const data of freeProductPromos) {
      for (const target of data.targets) {
        const benefit = target.benefit;

        const freeItem = products.find(
          (p) => p.id.value === benefit.freeItemId,
        );
        const condition: TprDirectPromoCondition = {
          id: EntityId.fromString(target.id),
          type: 'AllOf',
          criteria: [
            {
              criterion:
                target.tag !== '*'
                  ? MinimumPurchaseQtyByTagCriterion.create(
                      target.tag,
                      target.scaleQty,
                      target.scaleUomType,
                    )
                  : MinimumPurchaseQtyCriterion.create(
                      target.scaleQty,
                      target.scaleUomType,
                    ),
            },
          ],
          benefit: this.mapTPRBenefitToPromoBenefit({
            ...benefit,
            scaleQty: target.scaleQty,
            scaleUomType: target.scaleUomType,
            freeItem: freeItem
              ? {
                  item: freeItem,
                  qty: benefit.freeItemQty,
                  uomType: benefit.freeItemUomType,
                }
              : undefined,
          }),
          scaleQty: Quantity.create(target.scaleQty),
          scaleUomType: target.scaleUomType,
          priority: target.priority,
        };

        const promotion: TprDirectPromo = {
          id: EntityId.fromString(data.id),
          itemId:
            target.itemId === '*'
              ? target.itemId
              : EntityId.fromString(target.itemId),
          tag: target.tag !== '*' ? Tag.fromString(target.tag) : undefined,
          type: 'TPR',
          code: data.externalId,
          externalType: data.externalType,
          priority: data.priority,
          condition,
        };

        promotions.push(promotion);
      }
    }

    return promotions;
  }

  private async getTags(
    identity: UserIdentity,
    productIds: string[],
  ): Promise<string[]> {
    if (productIds.length === 0) return [];
    const tags = await this.dataSource
      .createQueryBuilder(TypeOrmItemSalesConfigEntity, 'config')
      .where('config.itemId in (:...ids)', { ids: productIds })
      .andWhere('config.key in (:...keys)', {
        keys: KeyUtil.getSalesConfigKeys(identity),
      })
      .getMany();

    return uniq(tags.map((x) => x.tags).flat());
  }

  private mapToPromoBenefit(benefit: IPromoBenefit | undefined): PromoBenefit {
    if (!benefit) {
      return {
        discount: undefined,
        coin: undefined,
      };
    }

    let discount: DiscountBenefit | undefined;
    let coin: CoinBenefit | undefined;
    let product: ProductBenefit | undefined;

    if (benefit.discountType && benefit.discountValue) {
      if (benefit.discountType === 'PERCENTAGE') {
        discount = {
          type: 'PERCENTAGE',
          value: Percentage.create(benefit.discountValue || 0),
          scaleUomType: benefit.scaleUomType || UomTypeEnum.BASE,
        };
      } else {
        discount = {
          type: 'AMOUNT',
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          value: Money.create(
            (benefit.discountValue || 0) / (benefit.scaleQty || 1),
          ),
          scaleUomType: benefit.scaleUomType || UomTypeEnum.BASE,
        };
      }
    }

    if (benefit.coinType && benefit.coinValue) {
      if (benefit.coinType === 'PERCENTAGE') {
        coin = {
          type: 'PERCENTAGE',
          value: Percentage.create(benefit.coinValue),
          scaleUomType: benefit.scaleUomType || UomTypeEnum.BASE,
        };
      } else {
        coin = {
          type: 'AMOUNT',
          value: Money.create(benefit.coinValue / (benefit.scaleQty || 1)),
          scaleUomType: benefit.scaleUomType || UomTypeEnum.BASE,
        };
      }
    }

    if (benefit.freeItem && benefit.freeItem.qty && benefit.freeItem.uomType) {
      product = {
        type: 'FREE_PRODUCT',
        freeItem: benefit.freeItem.item,
        freeItemQty: benefit.freeItem.qty,
        freeItemUomType: benefit.freeItem.uomType,
      };
    }

    return {
      discount,
      coin,
      product,
      maxQty: benefit.maxQty ? Quantity.create(benefit.maxQty) : undefined,
      maxUomType: benefit.maxUomType,
    };
  }

  private mapTPRBenefitToPromoBenefit(benefit: {
    benefitType?: BenefitType;
    benefitValue?: number;
    discountPercentage?: number;
    coinPercentage?: number;
    scaleQty: number;
    scaleUomType: UomType;
    freeItem?: IFreeItem;
    maxQty?: number;
    maxUomType?: UomType;
  }): PromoBenefit {
    return this.mapToPromoBenefit({
      discountType: benefit.benefitType,
      discountValue:
        benefit.benefitValue && benefit.discountPercentage
          ? benefit.benefitValue * benefit.discountPercentage * 0.01
          : undefined,
      coinType: benefit.benefitType,
      coinValue:
        benefit.benefitValue && benefit.coinPercentage
          ? benefit.benefitValue * benefit.coinPercentage * 0.01
          : undefined,
      scaleQty: benefit.scaleQty,
      scaleUomType: benefit.scaleUomType,
      freeItem: benefit.freeItem,
      maxQty: benefit.maxQty,
      maxUomType: benefit.maxUomType,
    });
  }

  private mapCmsPromotionCondition(
    item: TypeOrmItemEntity,
  ): FlashSalePromoCondition | RegularPromoCondition {
    const criteria = item.promoCMSCriteria[0];

    const benefit = this.mapToPromoBenefit({
      discountType: criteria.benefit.discountType,
      discountValue: criteria.benefit.discountValue,
      coinType: criteria.benefit.coinType,
      coinValue: criteria.benefit.coinValue,
      scaleQty: criteria.benefit.scaleQty,
      scaleUomType: criteria.benefit.scaleQtyUomType,
      maxQty: criteria.benefit.maxQty,
      maxUomType: criteria.benefit.maxQtyUomType,
    });

    const uoms: ISalesUom[] = item.uoms.map((x) => ({
      tier: SalesTier.create(x.tier),
      name: x.uom,
      qty: PackQty.create(x.packQty),
    }));
    const baseUom = SalesUtil.getEffectiveBaseUom(item.baseUom, uoms);
    const itemConfig = {
      packQty: item.packQty ?? 1,
      baseUom,
    };

    if (criteria.promo.type === PromoTypes.FlashSale) {
      // ignore qty when there is redemptions before
      const minQty = criteria.redemptions.length
        ? 1
        : this.convertQtyToBase(
            {
              qty: criteria.minQty,
              uomType: criteria.minQtyUomType,
            },
            itemConfig,
          ).value;
      return {
        type: 'AllOf',
        maxQty: this.convertQtyToBase(
          {
            qty: criteria.benefit.maxQty!,
            uomType: criteria.benefit.maxQtyUomType!,
          },
          itemConfig,
        ),
        maxQtyUomType: criteria.benefit.maxQtyUomType,
        criteria: [
          {
            criterion:
              criteria.tag !== '*'
                ? MinimumPurchaseQtyByTagCriterion.create(
                    criteria.tag,
                    minQty,
                    UomTypeEnum.BASE,
                  )
                : MinimumPurchaseQtyCriterion.create(minQty),
            minQtyUomType: criteria.minQtyUomType,
          },
        ],
        benefit,
      };
    } else {
      return {
        type: 'AllOf',
        criteria: [
          {
            criterion: MinimumPurchaseQtyCriterion.create(1),
          },
        ],
        benefit,
      };
    }
  }

  private convertQtyToBase(
    promoItem: {
      qty: number;
      uomType: UomTypeEnum;
    },
    item: {
      baseUom: ISalesUom;
      packQty: number;
    },
  ): Quantity {
    const { qty, uomType } = promoItem;
    const { baseUom, packQty } = item;
    if (uomType === UomTypeEnum.PACK) {
      return Quantity.create(qty * packQty);
    } else if (uomType === UomTypeEnum.INTERMEDIATE) {
      return Quantity.create(qty * baseUom.qty.value);
    }

    return Quantity.create(qty);
  }

  private async mapToTagCriteria(
    tagCriteria: TypeOrmPromoTPRTagCriteriaEntity,
    identity: UserIdentity,
  ): Promise<TagCriteria | undefined> {
    const criteria: TagCriteria = {
      items: [],
      itemMinQty: tagCriteria.includedItemMinQty || 0,
      itemMinUomType: tagCriteria.includedItemMinUomType || UomTypeEnum.BASE,
      isItemHasMatchingTag: true,
      minItemCombination: tagCriteria.minItemCombination,
      isRatioBased: tagCriteria.isRatioBased,
      includedTag: tagCriteria.includedTag
        ? Tag.fromString(tagCriteria.includedTag)
        : undefined,
      includedTagMinQty: tagCriteria.includedTagMinQty || 0,
      includedTagMinUomType:
        tagCriteria.includedTagMinUomType || UomTypeEnum.BASE,
    };

    if (tagCriteria.includedItemIds.length) {
      const validProductQuery = this.productHelperRepository
        .getValidProductQuery(identity)
        .andWhere('item.id = includedItem.id');

      const queryBuilder = this.dataSource
        .createQueryBuilder(TypeOrmItemEntity, 'includedItem')
        .innerJoinAndSelect('includedItem.info', 'info')
        .leftJoinAndSelect(
          'includedItem.uoms',
          'uoms',
          'uoms.slsOffice = :slsOffice',
          {
            slsOffice: KeyUtil.getSalesUomKeys(identity),
          },
        )
        .andWhere('includedItem.id IN (:...itemIds)', {
          itemIds: tagCriteria.includedItemIds,
        })
        .andWhere(
          new Brackets((qb) => {
            qb.where(`EXISTS (${validProductQuery.getQuery()})`);
          }),
        );

      queryBuilder.setParameters(validProductQuery.getParameters());

      const items = await queryBuilder.orderBy('uoms.tier', 'DESC').getMany();

      if (items.length !== tagCriteria.includedItemIds.length) {
        return;
      }

      items.forEach((x) => {
        criteria.items.push({
          id: x.id,
          name: x.info.name,
        });
      });
    }

    return criteria;
  }
}
