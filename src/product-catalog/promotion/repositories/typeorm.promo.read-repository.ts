import { uniq } from 'lodash';
import { Brackets, DataSource } from 'typeorm';

import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DivisionEnum } from '@wings-corporation/core';
import { Money, Percentage } from '@wings-corporation/domain';
import {
  FEATURE_FLAG_SERVICE,
  FeatureFlagService,
} from '@wings-corporation/nest-feature-flag';
import { KeyUtil } from '@wings-corporation/utils';
import {
  FeatureFlagNameEnum,
  SALES_ITEM_WRITE_REPOSITORY,
  UomType,
} from '@wings-online/app.constants';
import {
  PackQty,
  SalesItemUomReadModel,
  Tag,
} from '@wings-online/cart/domains';
import { ISalesItemWriteRepository } from '@wings-online/cart/interfaces';
import {
  CacheUtil,
  CoinBenefit,
  DiscountBenefit,
  ISalesUom,
  MinimumPurchaseQtyCriterion,
  PromoUtil,
  SalesTier,
  SalesUtil,
  TagCriteria,
  UserIdentity,
} from '@wings-online/common';
import {
  TypeOrmItemEntity,
  TypeOrmPromoTprEntity,
  TypeOrmPromoTprTagCriteriaEntity,
} from '@wings-online/product-catalog/entities';
import {
  MAX_CACHE_TTL_MS,
  PRODUCT_DEFAULT_BASE_UOM,
} from '@wings-online/product-catalog/product-catalog.constants';
import {
  DirectPromotionReadModel,
  FlashSaleReadModel,
  PromotionBenefit,
  PromotionReadModel,
  StrataAmountPromotionReadModel,
  StrataPromotionReadModel,
  StrataQtyPromotionReadModel,
} from '@wings-online/product-catalog/read-models';
import { TypeOrmProductHelperRepository } from '@wings-online/product-catalog/repositories/typeorm.product-helper.repository';
import { PromoUtils } from '@wings-online/product-catalog/utils/promo.util';

import { TypeOrmPromoCMSCriteriaEntity } from '../entities';
import { GetFlashSaleItemParams, IPromoReadRepository } from '../interfaces';
import {
  PromoPriorityTypes,
  PromoTypes,
  UomTypeEnum,
} from '../promotion.constants';

@Injectable()
export class TypeOrmPromoReadRepository implements IPromoReadRepository {
  private readonly productHelperRepository: TypeOrmProductHelperRepository;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(SALES_ITEM_WRITE_REPOSITORY)
    private readonly salesItemRepository: ISalesItemWriteRepository,
    @Inject(FEATURE_FLAG_SERVICE)
    private readonly featureFlagService: FeatureFlagService,
  ) {
    this.productHelperRepository = new TypeOrmProductHelperRepository(
      dataSource,
    );
  }

  private async useCache(): Promise<boolean> {
    const isApiCacheEnabled = await this.featureFlagService.isEnabled(
      FeatureFlagNameEnum.EnableAPICache,
    );
    return !isApiCacheEnabled;
  }

  async getFlashSaleItems(
    params: GetFlashSaleItemParams,
  ): Promise<FlashSaleReadModel[]> {
    const { identity, itemIds, status } = params;
    const query = this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoin('item.info', 'info')
      .innerJoinAndSelect(
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
      .innerJoinAndSelect('promo.targets', 'target')
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
      )
      .addCommonTableExpression(
        `SELECT now()+(COALESCE(MIN(value), '2') || ' hours')::interval AS threshold FROM m_parameter WHERE parameter_id = 'upcoming_display_in_hour' LIMIT 1`,
        'cte',
      )
      .leftJoin('cte', 'fs_config', 'TRUE')
      .andWhere(`promo.periodTo >= now()`);

    if (itemIds && itemIds.length > 0) {
      query.andWhere('criteria.itemId in (:...itemIds)', {
        itemIds: itemIds.concat('*'),
      });
    }

    if (status === 'ACTIVE') {
      query.andWhere(`promo.periodFrom <= now()`);
    } else if (status === 'UPCOMING') {
      query.andWhere(`promo.periodFrom BETWEEN now() AND fs_config.threshold`);
    } else {
      query.andWhere(`promo.periodFrom <= fs_config.threshold`);
    }

    const promoItems = await query.getMany();

    return promoItems.map((x) => this.toFlashSaleReadModel(x));
  }

  async listProductsRegularPromotions(
    identity: UserIdentity,
    productIds: string[],
    tags: string[],
  ): Promise<PromotionReadModel[]> {
    const query = this.dataSource
      .createQueryBuilder(TypeOrmItemEntity, 'item')
      .innerJoin('item.info', 'info')
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...slsOffice)',
        {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
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
      .innerJoinAndMapMany(
        'item.promoCMSCriteria',
        TypeOrmPromoCMSCriteriaEntity,
        'criteria',
        '(item.id)::varchar = (criteria.item_id)::varchar OR criteria.tag = ANY(salesConfigs.tags)',
      )
      .innerJoinAndSelect('criteria.promo', 'promo')
      .innerJoinAndSelect('promo.targets', 'target')
      .innerJoinAndSelect('criteria.benefit', 'benefit')
      .andWhere(`promo.type = '${PromoTypes.Regular}'`)
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
      .andWhere('criteria.itemId IN (:...itemId)', {
        itemId: productIds.concat('*'),
      })
      .andWhere('criteria.tag IN (:...tags)', { tags: tags.concat('*') })
      .andWhere(`promo.periodTo >= now()`)
      .andWhere(`promo.periodFrom <= now()`);

    const useCache = await this.useCache();
    if (useCache) {
      query.cache(
        CacheUtil.getCacheKey(
          `user:${identity.externalId}:promotions:regular:${CacheUtil.encode({
            productIds,
            tags,
            identity,
          })}`,
        ),
        CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_MS),
      );
    }
    const promoItems = await query.getMany();
    const promotions: PromotionReadModel[] = [];

    for (const promoItem of promoItems) {
      for (const criteria of promoItem.promoCMSCriteria) {
        const promotion = new DirectPromotionReadModel({
          id: criteria.promoId,
          externalId: criteria.promo.externalId,
          externalType: 'PKWO',
          priority: PromoPriorityTypes.MIN_PRIORITY,
          target: {
            tag: criteria.tag,
            itemId: criteria.itemId,
            priority: PromoPriorityTypes.MIN_PRIORITY,
          },
          type: 'DIRECT',
          isRegular: true,
        });

        const benefit = criteria.benefit;

        const promotionBenefit = PromoUtil.resolvePromotionBenefit(
          {
            type: benefit.discountType,
            value: benefit.discountValue,
            coinType: benefit.coinType,
            coinValue: benefit.coinValue,
          },
          {
            qty: benefit.scaleQty,
            uom: benefit.scaleQtyUomType,
          },
        );

        promotion.setCondition({
          promotionIds: [criteria.promoId],
          priorities: [PromoPriorityTypes.MIN_PRIORITY],
          minQty: 1,
          minQtyUomType: UomTypeEnum.BASE,
          benefit: promotionBenefit,
        });
        promotions.push(promotion);
      }
    }

    return promotions;
  }

  async listProductsPromotions(
    identity: UserIdentity,
    productIds: string[],
    tags: string[],
  ): Promise<PromotionReadModel[]> {
    const prefixTargets = PromoUtils.getPromoTPRTargets(identity);
    const targets = PromoUtils.getPromoTPRTargets(identity, false);

    const [promosWithoutDestCodes, promosWithValidDestCodes] =
      await Promise.all([
        this.dataSource
          .createQueryBuilder(TypeOrmPromoTprEntity, 'promo')
          .innerJoinAndSelect(
            'promo.targets',
            'target',
            `
            target.salesOrg in (:...salesOrgs) AND
            target.distChannel in (:...distChannels) AND
            target.salesOffice in (:...salesOffices) AND
            target.salesGroup in (:...salesGroups) AND
            target.group in (:...groups) AND
            target.buyerExternalId in (:...buyerExternalIds) AND
            target.periodFrom <= now() AND
            target.periodTo >= now()
            `,
          )
          .leftJoin('promo.destCodes', 'pdc')
          .leftJoinAndSelect('target.benefit', 'targetBenefit')
          .leftJoinAndSelect('target.criterias', 'criteria')
          .leftJoinAndSelect('criteria.benefit', 'criteriaBenefit')
          .leftJoinAndSelect('promo.tagCriteria', 'tagCriteria')
          .where('promo.useDestCode = false')
          .andWhere('target.itemId in (:...ids)', {
            ids: ['*'].concat(productIds),
          })
          .andWhere('target.tag in (:...tags)', {
            tags: ['*'].concat(uniq(tags)),
          })
          .andWhere('promo.entity = :entity', {
            entity: identity.organization,
          })
          .setParameters({
            salesOrgs: prefixTargets.salesOrgs,
            distChannels: prefixTargets.distChannels,
            salesOffices: prefixTargets.salesOffices,
            salesGroups: prefixTargets.salesGroups,
            groups: prefixTargets.groups,
            buyerExternalIds: prefixTargets.buyerExternalIds,
          })
          .getMany(),
        this.dataSource
          .createQueryBuilder(TypeOrmPromoTprEntity, 'promo')
          .innerJoinAndSelect(
            'promo.targets',
            'target',
            'target.periodFrom <= now() AND target.periodTo >= now()',
          )
          .innerJoin('promo.destCodes', 'pdc')
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
          .leftJoinAndSelect('target.criterias', 'criteria')
          .leftJoinAndSelect('criteria.benefit', 'criteriaBenefit')
          .leftJoinAndSelect('promo.tagCriteria', 'tagCriteria')
          .where('promo.useDestCode = true')
          .andWhere('target.itemId in (:...ids)', {
            ids: ['*'].concat(productIds),
          })
          .andWhere('target.tag in (:...tags)', {
            tags: ['*'].concat(uniq(tags)),
          })
          .andWhere('promo.entity = :entity', {
            entity: identity.organization,
          })
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
          })
          .getMany(),
      ]);

    const allPromos = promosWithoutDestCodes.concat(promosWithValidDestCodes);
    const promotions: PromotionReadModel[] = [];

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

          const promotion = new DirectPromotionReadModel({
            id: data.id,
            type: target.type,
            externalType: data.externalType,
            priority: data.priority,
            target: {
              tag: target.tag,
              itemId: target.itemId,
              priority: target.priority,
            },
            externalId: data.externalId,
          });

          let promotionBenefit: PromotionBenefit;
          if (
            target.benefit.freeItemId &&
            target.benefit.freeItemQty &&
            target.benefit.freeItemUomType
          ) {
            const item = products.find(
              (p) => p.id.value === target.benefit.freeItemId,
            );

            if (!item) continue;

            promotionBenefit = PromoUtil.resolvePromotionBenefit(
              benefit,
              {
                qty: target.scaleQty,
                uom: target.scaleUomType,
              },
              {
                id: target.benefit.freeItemId,
                name: item.name,
                benefitQty: target.benefit.freeItemQty,
                benefitUom: target.benefit.freeItemUomType,
                uom: {
                  base: item.base.uom as UomType,
                  baseQty: item.base.contains,
                  intermediate: item.intermediate
                    ? (item.intermediate.uom as UomType)
                    : null,
                  intermediateQty: item.intermediate
                    ? item.intermediate.contains
                    : null,
                  pack: item.pack ? (item.pack.uom as UomType) : null,
                  packQty: item.pack ? item.pack.contains : null,
                },
              },
            );

            promotion.setCondition({
              promotionIds: [data.id],
              priorities: [data.priority],
              minQty: promotionBenefit.product?.scaleQty || 1,
              minQtyUomType:
                promotionBenefit.product?.scaleUomType || UomTypeEnum.BASE,
              benefit: promotionBenefit,
            });
          } else if (target.benefit.type && target.benefit.value) {
            promotionBenefit = PromoUtil.resolvePromotionBenefit(benefit, {
              qty: target.scaleQty,
              uom: target.scaleUomType,
            });

            promotion.setCondition({
              promotionIds: [data.id],
              priorities: [data.priority],
              minQty: data.tagCriteria?.tagMinQty || 1,
              minQtyUomType:
                data.tagCriteria?.tagMinUomType || UomTypeEnum.BASE,
              benefit: promotionBenefit,
              tagCriteria: tagCriteria
                ? {
                    ...tagCriteria,
                    isItemHasMatchingTag: target.itemId === '*',
                  }
                : undefined,
            });
          } else {
            continue;
          }

          promotions.push(promotion);
        } else {
          const criterias = target.criterias.filter((c) => c.benefit);
          if (criterias.length === 0) continue;

          let promotion: StrataPromotionReadModel | undefined;
          if (criterias[0].minQty !== undefined && !criterias[0].minPurchase) {
            promotion = new StrataQtyPromotionReadModel({
              id: data.id,
              type: target.type,
              externalType: data.externalType,
              priority: data.priority,
              target: {
                tag: target.tag,
                itemId: target.itemId,
                priority: target.priority,
              },
              externalId: data.externalId,
            });

            for (const criteria of criterias) {
              promotion.addCondition({
                promotionIds: [data.id],
                priorities: [data.priority],
                minQty: criteria.minQty,
                minQtyUomType: criteria.minQtyUomType!,
                benefit: PromoUtil.resolvePromotionBenefit(criteria.benefit, {
                  qty: target.scaleQty,
                  uom: target.scaleUomType,
                }),
                tagCriteria: tagCriteria
                  ? {
                      ...tagCriteria,
                      isItemHasMatchingTag: target.itemId === '*',
                    }
                  : undefined,
              });
            }
          } else {
            if (target.itemId === '*') continue; // only handle strata amount promotion for item specific target

            promotion = new StrataAmountPromotionReadModel({
              id: data.id,
              type: target.type,
              externalType: data.externalType,
              priority: data.priority,
              target: {
                itemId: target.itemId,
                tag: '*',
                priority: target.priority,
              },
              externalId: data.externalId,
            });

            for (const criteria of criterias) {
              promotion.addCondition({
                promotionIds: [data.id],
                priorities: [data.priority],
                minAmount: criteria.minPurchase,
                benefit: PromoUtil.resolvePromotionBenefit(criteria.benefit, {
                  qty: target.scaleQty,
                  uom: target.scaleUomType,
                }),
              });
            }
          }

          promotions.push(promotion);
        }
      }
    }

    return promotions;
  }

  private toFlashSaleReadModel(item: TypeOrmItemEntity): FlashSaleReadModel {
    const criteria = item.promoCMSCriteria[0];
    const { promo, benefit, redemptions } = criteria;
    let discount: DiscountBenefit;
    let coin: CoinBenefit | undefined;

    if (benefit.discountType === 'PERCENTAGE') {
      discount = {
        type: 'PERCENTAGE',
        value: Percentage.create(benefit.discountValue || 0),
      };
    } else {
      discount = {
        type: 'AMOUNT',
        value: Money.create(benefit.discountValue || 0),
      };
    }

    if (benefit.coinType && benefit.coinValue) {
      if (benefit.coinType === 'PERCENTAGE') {
        coin = {
          type: 'PERCENTAGE',
          value: Percentage.create(benefit.coinValue),
        };
      } else {
        coin = {
          type: 'AMOUNT',
          value: Money.create(benefit.coinValue),
        };
      }
    }

    const uoms: ISalesUom[] = item.uoms.map((x) => ({
      tier: SalesTier.create(x.tier),
      name: x.uom,
      qty: PackQty.create(x.packQty),
    }));
    const baseUom = SalesUtil.getEffectiveBaseUom(
      item.baseUom || PRODUCT_DEFAULT_BASE_UOM,
      uoms,
    );
    const itemConfig = {
      packQty: item.packQty ?? 1,
      baseUom,
    };

    return new FlashSaleReadModel({
      id: promo.id,
      externalId: promo.externalId,
      startAt: promo.periodFrom,
      endAt: promo.periodTo,
      target: {
        type: criteria.tag === '*' ? 'ITEM' : 'TAG',
        value: criteria.tag === '*' ? criteria.itemId : criteria.tag,
      },
      criteria: {
        id: criteria.id,
        criterion: MinimumPurchaseQtyCriterion.create(
          // ignore qty when there is redemptions before
          redemptions.length
            ? 1
            : this.convertQtyToBase(
                {
                  qty: criteria.minQty,
                  uomType: criteria.minQtyUomType,
                },
                itemConfig,
              ),
        ),
        minQtyUomType: redemptions.length
          ? UomTypeEnum.BASE
          : criteria.minQtyUomType,
      },
      benefit: {
        discount,
        coin,
        scaleQty: this.convertQtyToBase(
          {
            qty: benefit.scaleQty || 1,
            uomType: benefit.scaleQtyUomType,
          },
          itemConfig,
        ),
        maxQty: this.convertQtyToBase(
          {
            qty: benefit.maxQty!,
            uomType: benefit.maxQtyUomType!,
          },
          itemConfig,
        ),
        maxQtyUomType: benefit.maxQtyUomType!,
        scaleQtyUomType: benefit.scaleQtyUomType,
      },
      redeemedQty: redemptions.reduce<number>((acc, r) => {
        return acc + r.qty;
      }, 0),
    });
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
  ): number {
    const { qty, uomType } = promoItem;
    const { baseUom, packQty } = item;
    if (uomType === UomTypeEnum.PACK) {
      return qty * packQty;
    } else if (uomType === UomTypeEnum.INTERMEDIATE) {
      return qty * baseUom.qty.value;
    }

    return qty;
  }

  private async mapToTagCriteria(
    tagCriteria: TypeOrmPromoTprTagCriteriaEntity,
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
        return undefined;
      }

      items.forEach((x) => {
        criteria.items.push({
          id: x.id,
          name: x.info.name,
          uom: {
            base: x.baseUom,
            intermediate: x.uoms[0]?.uom,
            pack: x.packUom,
          },
        });
      });
    }

    return criteria;
  }
}
