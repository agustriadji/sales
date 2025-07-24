import { uniq } from 'lodash';
import { DateTime } from 'luxon';
import { Brackets } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { DivisionEnum, Nullable } from '@wings-corporation/core';
import {
  EntityId,
  Money,
  Quantity,
  WatchedProps,
} from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { KeyUtil } from '@wings-corporation/utils';
import {
  LEGACY_MATERIAL_PACK_UOM,
  RecommendationType,
  TAG_KEY_MATERIAL_GROUP_2,
  UomTypeEnum,
} from '@wings-online/app.constants';
import { ItemVoucher } from '@wings-online/cart/domains/item-voucher.entity';
import {
  PromoPriorityTypes,
  PromoTypes,
  TypeOrmPromoCMSCriteriaBenefitEntity,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoTPRCriteriaEntity,
  TypeOrmPromoTPREntity,
  TypeOrmPromoTPRTagCriteriaEntity,
  TypeOrmPromoTPRTargetEntity,
} from '@wings-online/cart/promotion';
import { VoucherDiscountType } from '@wings-online/cart/voucher/interfaces';
import {
  BenefitType,
  SalesTier,
  SalesUtil,
  TagCriteria,
  UserIdentity,
} from '@wings-online/common';
import {
  ItemUom,
  UomConversion,
} from '@wings-online/common/interfaces/item-uom.interface';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';
import {
  TypeOrmRecommendationCsEntity,
  TypeOrmRecommendationUsEntity,
} from '@wings-online/product-catalog/entities';
import { PromoUtils } from '@wings-online/product-catalog/utils/promo.util';

import { CartType } from '../cart.constants';
import {
  CheckoutFactory,
  CheckoutItem,
  CheckoutItemVoucherList,
  Criterion,
  FlashSale,
  FreeProduct,
  GeneralVoucher,
  ICartVoucherAggregate,
  ICheckoutAggregate,
  ItemFlashSale,
  ItemLifetimePromotion,
  ItemPromotion,
  ItemPurchaseAmountBetweenCriterion,
  ItemPurchaseBetweenCriterion,
  ItemRegularPromotions,
  ItemTagPurchaseBetweenCriterion,
  MinimumItemPurchaseAmountCriterion,
  MinimumItemPurchaseCriterion,
  MinimumItemTagPurchaseCriterion,
  MinimumPurchaseByItemCriterion,
  MinimumPurchaseByTagCriterion,
  MonetaryBenefit,
  PackQty,
  PromoBenefit,
  PromoCriterionWithBenefit,
  PromoPercentage,
  PromotionConditionExactlyOne,
  PromotionConditionOneOf,
  RegularPromo,
  SalesFactor,
  SalesItemFactor,
  SalesItemPrice,
  Tag,
  TPRPromo,
} from '../domains';
import {
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmCartVoucherEntity,
  TypeOrmItemEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemPriceEntity,
} from '../entities';
import {
  ICartVoucherWriteRepository,
  ICheckoutWriteRepository,
} from '../interfaces';

@Injectable()
export class TypeOrmCheckoutWriteRepository
  implements ICheckoutWriteRepository, ICartVoucherWriteRepository
{
  constructor(
    private readonly uowService: TypeOrmUnitOfWorkService,
    private readonly factory: CheckoutFactory,
    private readonly parameterService: ParameterService,
  ) {}

  async getCart<TAggregate = ICheckoutAggregate | ICartVoucherAggregate>(
    type: CartType,
    identity: UserIdentity,
  ): Promise<TAggregate | undefined> {
    let aggregate: TAggregate | undefined;

    const queryBuilder = this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmCartEntity, 'cart')
      .leftJoinAndSelect('cart.items', 'items')
      .leftJoinAndSelect('cart.vouchers', 'vouchers')
      .leftJoinAndSelect('cart.tags', 'tag')
      .leftJoinAndSelect('vouchers.voucher', 'voucher')
      .leftJoinAndSelect(
        'voucher.customer',
        'target',
        `target.cust_id = :externalId OR (target.sls_office IN (:...slsOffice) AND target.cust_group IN (:...custGroup) AND target.cust_id = '')`,
        {
          slsOffice: [
            identity.division.dry?.salesOffice,
            identity.division.frozen?.salesOffice,
          ].filter(Boolean),
          custGroup: [
            identity.division.dry?.group,
            identity.division.frozen?.group,
          ].filter(Boolean),
        },
      )
      .leftJoinAndSelect('target.material', 'material')
      .leftJoinAndMapOne(
        'material.item',
        TypeOrmItemEntity,
        'voucherItem',
        `voucherItem.entity = :entity AND (voucherItem.externalId)::varchar = material.materialId`,
        {
          entity: identity.organization,
        },
      )
      .leftJoinAndSelect('items.item', 'item')
      .leftJoinAndSelect('item.info', 'info')
      .leftJoinAndMapOne(
        'item.recommendationCs',
        TypeOrmRecommendationCsEntity,
        'recommendationCs',
        '(item.externalId)::varchar = recommendationCs.externalId AND recommendationCs.buyerExternalId = :externalId',
      )
      .addSelect('recommendationCs.id')
      .leftJoinAndMapOne(
        'item.recommendationUs',
        TypeOrmRecommendationUsEntity,
        'recommendationUs',
        '(item.externalId)::varchar = recommendationUs.externalId AND recommendationUs.buyerExternalId = :externalId',
      )
      .addSelect('recommendationUs.id')
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...salesUomKeys)',
        {
          salesUomKeys: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .setParameter('externalId', identity.externalId);

    if (
      (type === 'DRY' && identity.division.dry?.isRetailS) ||
      (type === 'FROZEN' && identity.division.frozen?.isRetailS)
    ) {
      queryBuilder.innerJoin(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
    }

    const entity = await queryBuilder
      .leftJoinAndSelect(
        'item.salesFactors',
        'salesFactors',
        'salesFactors.key in (:...factorKeys) AND salesFactors.validFrom <= now() AND salesFactors.validTo >= now()',
        {
          factorKeys: KeyUtil.getSalesFactorKeys(identity),
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
      .innerJoinAndSelect(
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
      .andWhere('exclusions.itemId IS NULL')
      .leftJoinAndSelect('items.simulatedPrice', 'simulatedPrice')
      .andWhere('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('cart.type = :type', { type })
      .andWhere('item.isActive = true')
      .getOne();

    if (entity) {
      aggregate = (await this.toAggregate<TAggregate>(identity, [entity]))[0];
    }

    return aggregate;
  }

  async getCarts<TAggregate = ICartVoucherAggregate | ICheckoutAggregate>(
    identity: UserIdentity,
  ): Promise<TAggregate[]> {
    const { dry, frozen } = identity.division;
    const types = new Array()
      .concat(dry ? 'DRY' : [])
      .concat(frozen ? 'FROZEN' : []);
    if (!types.length) return [];

    const query = this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmCartEntity, 'cart')
      .leftJoinAndSelect('cart.items', 'items')
      .leftJoinAndSelect('cart.vouchers', 'vouchers')
      .leftJoinAndSelect('cart.tags', 'tag')
      .leftJoinAndSelect('vouchers.voucher', 'voucher')
      .leftJoinAndSelect(
        'voucher.customer',
        'target',
        `target.cust_id = :externalId OR (target.sls_office IN (:...slsOffice) AND target.cust_group IN (:...custGroup) AND target.cust_id = '')`,
        {
          slsOffice: [
            identity.division.dry?.salesOffice,
            identity.division.frozen?.salesOffice,
          ].filter(Boolean),
          custGroup: [
            identity.division.dry?.group,
            identity.division.frozen?.group,
          ].filter(Boolean),
        },
      )
      .leftJoinAndSelect('target.material', 'material')
      .leftJoinAndMapOne(
        'material.item',
        TypeOrmItemEntity,
        'voucherItem',
        `voucherItem.entity = :entity AND (voucherItem.externalId)::varchar = material.materialId`,
        {
          entity: identity.organization,
        },
      )
      .leftJoinAndSelect('items.item', 'item')
      .leftJoinAndSelect('item.info', 'info')
      .leftJoinAndMapOne(
        'item.recommendationCs',
        TypeOrmRecommendationCsEntity,
        'recommendationCs',
        '(item.externalId)::varchar = recommendationCs.externalId AND recommendationCs.buyerExternalId = :externalId',
      )
      .addSelect('recommendationCs.id')
      .leftJoinAndMapOne(
        'item.recommendationUs',
        TypeOrmRecommendationUsEntity,
        'recommendationUs',
        '(item.externalId)::varchar = recommendationUs.externalId AND recommendationUs.buyerExternalId = :externalId',
      )
      .addSelect('recommendationUs.id')
      .leftJoinAndSelect(
        'item.uoms',
        'uoms',
        'uoms.slsOffice in (:...salesUomKeys)',
        {
          salesUomKeys: KeyUtil.getSalesUomKeys(identity),
        },
      )
      .leftJoinAndSelect(
        'item.salesFactors',
        'salesFactors',
        'salesFactors.key in (:...factorKeys) AND salesFactors.validFrom <= now() AND salesFactors.validTo >= now()',
        {
          factorKeys: KeyUtil.getSalesFactorKeys(identity),
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
      .innerJoinAndSelect(
        'item.salesConfigs',
        'salesConfigs',
        'salesConfigs.key in (:...configKeys)',
        {
          configKeys: KeyUtil.getSalesConfigKeys(identity),
        },
      )
      .leftJoin(
        'item.exclusions',
        'exclusions',
        'exclusions.key in (:...excludeKeys) AND exclusions.validFrom <= now() AND exclusions.validTo >= now()',
        {
          excludeKeys: KeyUtil.getSalesExcludeKeys(identity),
        },
      )
      .leftJoinAndSelect('items.simulatedPrice', 'simulatedPrice');

    if (SalesUtil.isRetailS(identity)) {
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
          `(retailConfigs.itemId IS NOT NULL OR cart.type = 'FROZEN')`,
        );
      } else if (identity.division.frozen?.isRetailS) {
        query.andWhere(
          `(retailConfigs.itemId IS NOT NULL OR cart.type = 'DRY')`,
        );
      }
    }

    const entities = await query
      .andWhere('exclusions.itemId IS NULL')
      .andWhere('cart.buyerId = :buyerId', { buyerId: identity.id })
      .andWhere('cart.type IN (:...types)', { types })
      .andWhere('item.isActive = true')
      .setParameter('externalId', identity.externalId)
      .getMany();

    return await this.toAggregate<TAggregate>(identity, entities);
  }

  async save(aggregate: ICartVoucherAggregate): Promise<void> {
    if (aggregate.props.generalVoucher?.isDirty()) {
      const initialGeneralVoucher =
        aggregate.props.generalVoucher.getInitialProps();
      const currentGeneralVoucher =
        aggregate.props.generalVoucher.getCurrentProps();

      if (initialGeneralVoucher) {
        await this.uowService
          .getEntityManager()
          .delete(TypeOrmCartVoucherEntity, {
            cartId: aggregate.id.value,
            voucherId: initialGeneralVoucher.id.value,
          });

        if (currentGeneralVoucher) {
          await this.uowService
            .getEntityManager()
            .insert(TypeOrmCartVoucherEntity, {
              cartId: aggregate.id.value,
              voucherId: currentGeneralVoucher.id.value,
              createdAt: currentGeneralVoucher.appliedAt,
            });
        }
      } else {
        if (currentGeneralVoucher) {
          await this.uowService
            .getEntityManager()
            .insert(TypeOrmCartVoucherEntity, {
              cartId: aggregate.id.value,
              voucherId: currentGeneralVoucher.id.value,
              createdAt: currentGeneralVoucher.appliedAt,
            });
        }
      }
    }

    if (aggregate.props.itemVouchers.getNewItems().length > 0) {
      await this.uowService.getEntityManager().insert(
        TypeOrmCartVoucherEntity,
        aggregate.props.itemVouchers.getNewItems().map((v) => ({
          cartId: aggregate.id.value,
          voucherId: v.id.value,
          createdAt: v.appliedAt,
        })),
      );
    }

    if (aggregate.props.itemVouchers.getRemovedItems().length > 0) {
      for (const voucher of aggregate.props.itemVouchers.getRemovedItems()) {
        await this.uowService
          .getEntityManager()
          .delete(TypeOrmCartVoucherEntity, {
            voucherId: voucher.id.value,
          });
      }
    }
  }

  async delete(aggregate: ICheckoutAggregate): Promise<void> {
    await this.uowService.getEntityManager().delete(TypeOrmCartEntity, {
      id: aggregate.id.value,
    });
  }

  private async getCartMinimumPurchase(
    identity: UserIdentity,
    type: CartType,
  ): Promise<Money> {
    if (
      (type === 'DRY' && !identity.division.dry) ||
      (type === 'FROZEN' && !identity.division.frozen)
    ) {
      return Money.zero();
    }

    const valuePrefix = `${identity.organization}-${type}`;

    const parameters = this.parameterService.get(
      ParameterKeys.MINIMUM_ORDER_CUSTOMER_GROUP,
    );
    const defaultParameters = this.parameterService.get(
      ParameterKeys.MINIMUM_ORDER_DEFAULT,
    );

    if (parameters) {
      const parameter = parameters.find((parameter) =>
        parameter.value
          .toLowerCase()
          .startsWith(
            type === 'DRY'
              ? `${valuePrefix}-${identity.division.dry!.group}-`.toLowerCase()
              : `${valuePrefix}-${
                  identity.division.frozen!.group
                }-`.toLowerCase(),
          ),
      );

      if (parameter) {
        return Money.create(Number(parameter.value.split('-').pop()));
      }
    }

    if (defaultParameters) {
      const parameter = defaultParameters.find((parameter) =>
        parameter.value
          .toLowerCase()
          .startsWith(`${identity.organization}-${type}-`.toLowerCase()),
      );

      if (parameter) {
        return Money.create(Number(parameter.value.split('-').pop()));
      }
    }

    return Money.zero();
  }

  private getItemPrice(prices: TypeOrmItemPriceEntity[]): Money | undefined {
    const priceItems = prices.map((itemPrice) => {
      return SalesItemPrice.create(
        SalesTier.create(itemPrice.tier),
        Money.create(itemPrice.price),
      );
    });

    return SalesUtil.getEffectiveSalesPrice(priceItems);
  }

  private async getItemFlashSale(
    identity: UserIdentity,
    itemsUom: Record<string, ItemUom>,
  ): Promise<ItemFlashSale[]> {
    if (Object.keys(itemsUom).length === 0) return [];

    const query = this.uowService
      .getEntityManager()
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
      .andWhere(`promo.type = 'FLS'`)
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
      .andWhere('item.id in (:...itemIds)', {
        itemIds: Object.keys(itemsUom),
      })
      .andWhere(`promo.periodFrom <= now()`)
      .andWhere(`promo.periodTo >= now()`);

    const result = await query.getMany();

    const itemsFlashSale = new Array<ItemFlashSale>();

    result.map((item) => {
      const criteria = item.promoCMSCriteria[0];
      if (!criteria) return;

      const flashSaleMinQty = criteria.redemptions.length
        ? Quantity.create(1)
        : SalesUtil.convertQtyToBaseQty(
            criteria.minQty,
            criteria.minQtyUomType,
            this.toUomConversion(itemsUom[item.id]),
          );

      itemsFlashSale.push(
        ItemPromotion.create(
          {
            promotion: FlashSale.create({
              externalId: criteria.promo.externalId,
              criteriaId: criteria.id,
              condition: PromotionConditionExactlyOne.create({
                criteria:
                  criteria.tag === '*'
                    ? MinimumItemPurchaseCriterion.create({
                        itemId: EntityId.fromString(item.id),
                        minQty: flashSaleMinQty,
                      })
                    : MinimumItemTagPurchaseCriterion.create({
                        tag: Tag.fromString(criteria.tag),
                        minQty: flashSaleMinQty,
                      }),
                benefit: this.toPromoBenefitEntity(
                  criteria.benefit,
                  itemsUom[item.id],
                ),
              }),
              redemptions: criteria.redemptions.map((x) => {
                return {
                  orderNumber: x.orderNumber,
                  qty: Quantity.create(x.qty),
                };
              }),
            }),
            itemId: EntityId.fromString(item.id),
          },
          item.id,
        ),
      );
    });

    return itemsFlashSale;
  }

  private async getItemRegularPromotions(
    identity: UserIdentity,
    itemsUom: Record<string, ItemUom>,
    tags: string[],
  ): Promise<ItemRegularPromotions[]> {
    if (Object.keys(itemsUom).length === 0) return [];

    const query = this.uowService
      .getEntityManager()
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
      .where('item.id IN (:...id)', { id: Object.keys(itemsUom) })
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
        itemIds: Object.keys(itemsUom).concat('*'),
      })
      .andWhere('criteria.tag IN (:...tags)', {
        tags: tags.concat('*'),
      })
      .andWhere(`promo.periodFrom <= now()`)
      .andWhere(`promo.periodTo >= now()`);

    const entities = await query.getMany();

    const result: ItemRegularPromotions[] = [];

    for (const entity of entities) {
      const criteria = entity.promoCMSCriteria[0];
      if (!criteria) continue;
      result.push(
        ItemPromotion.create(
          {
            itemId: EntityId.fromString(entity.id),
            promotion: RegularPromo.create({
              externalId: criteria.promo.externalId,
              priority: PromoPriorityTypes.MIN_PRIORITY,
              condition: PromotionConditionExactlyOne.create({
                benefit: this.toPromoBenefitEntity(
                  criteria.benefit,
                  itemsUom[entity.id],
                ),
                criteria:
                  criteria.tag === '*'
                    ? MinimumItemPurchaseCriterion.create({
                        itemId: EntityId.fromString(entity.id),
                        minQty: SalesUtil.convertQtyToBaseQty(
                          criteria.minQty,
                          criteria.minQtyUomType,
                          this.toUomConversion(itemsUom[entity.id]),
                        ),
                      })
                    : MinimumItemTagPurchaseCriterion.create({
                        tag: Tag.fromString(criteria.tag),
                        minQty: SalesUtil.convertQtyToBaseQty(
                          criteria.minQty,
                          criteria.minQtyUomType,
                          this.toUomConversion(itemsUom[entity.id]),
                        ),
                      }),
              }),
            }),
          },
          entity.id,
        ),
      );
    }
    return result;
  }

  private async getItemTPRPromotions(
    identity: UserIdentity,
    tags: string[],
    cartItems: TypeOrmCartItemEntity[],
  ): Promise<ItemRegularPromotions[]> {
    if (cartItems.length === 0) return [];
    const { dry, frozen } = identity.division;

    const prefixTargets = PromoUtils.getPromoTPRTargets(identity);
    const targets = PromoUtils.getPromoTPRTargets(identity, false);

    const withoutDestCodeQuery = this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmPromoTPREntity, 'promo')
      .innerJoinAndSelect('promo.targets', 'target')
      .leftJoinAndSelect('promo.tagCriteria', 'tagCriteria')
      .leftJoin('promo.destCodes', 'pdc')
      .leftJoinAndSelect('target.benefit', 'targetBenefit')
      .leftJoinAndSelect('target.criteria', 'criteria')
      .leftJoinAndSelect('criteria.benefit', 'criteriaBenefit')
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
      .where('promo.useDestCode = false')
      .andWhere('promo.entity = :entity', {
        entity: identity.organization,
      })
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
        buyerExternalIds: prefixTargets.buyerExternalIds,
      })
      .andWhere('target.periodFrom <= now()')
      .andWhere('target.periodTo >= now()')
      .andWhere('target.itemId in (:...ids)', {
        ids: cartItems.map((item) => item.itemId).concat('*'),
      })
      .andWhere('target.tag in (:...tags)', {
        tags: uniq(tags.concat('*')),
      });

    const withDestCodeQuery = this.uowService
      .getEntityManager()
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
        ids: cartItems.map((item) => item.itemId).concat('*'),
      })
      .andWhere('target.tag in (:...tags)', {
        tags: uniq(tags.concat('*')),
      })
      .andWhere('promo.entity = :entity', {
        entity: identity.organization,
      });

    const isSalesRetail = SalesUtil.isRetailS(identity);
    if (isSalesRetail) {
      withoutDestCodeQuery.leftJoinAndSelect(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
      withDestCodeQuery.leftJoinAndSelect(
        'item.retailConfigs',
        'retailConfigs',
        'retailConfigs.key in (:...retailConfigKeys) AND retailConfigs.validFrom <= now() AND retailConfigs.validTo >= now()',
        {
          retailConfigKeys: KeyUtil.getSalesRetailKeys(identity),
        },
      );
    }

    const [promosWithoutDestCodes, promosWithValidDestCodes] =
      await Promise.all([
        withoutDestCodeQuery.getMany(),
        withDestCodeQuery
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

    const allPromos: TypeOrmPromoTPREntity[] = promosWithoutDestCodes.concat(
      promosWithValidDestCodes,
    );

    const promotions: ItemRegularPromotions[] = [];
    const promoTagCriteria: Record<string, TagCriteria> = {};

    for (const promo of allPromos) {
      if (promo.tagCriteria) {
        promoTagCriteria[promo.id] = await this.mapToTagCriteria(
          promo.tagCriteria,
          identity,
        );
      }
    }

    const itemUom = this.getItemsUom(
      cartItems.map((cartItem) => cartItem.item),
    );

    for (const cartItem of cartItems) {
      const tags = cartItem.item.salesConfigs[0].tags || [];

      for (const promo of allPromos) {
        const tagCriteria = promoTagCriteria[promo.id];

        for (const target of promo.targets) {
          if (target.itemId !== cartItem.itemId && !tags.includes(target.tag)) {
            continue;
          }

          let tagItemId: string | undefined;
          if (target.tag !== '*' && target.itemId === cartItem.itemId) {
            // item is not tagged with the target.tag so we need to find another item that is tagged with the target.tag
            tagItemId = cartItems.find((item) =>
              item.item.salesConfigs[0].tags.includes(target.tag),
            )?.itemId;
            if (!tagItemId) continue;
          } else {
            tagItemId = cartItem.itemId;
          }

          if (target.type === 'DIRECT') {
            if (!target.benefit) continue;

            // checking valid free item
            if (
              target.benefit.freeItemId &&
              (!target.benefit.freeItem ||
                !target.benefit.freeItem.info ||
                !target.benefit.freeItem.salesConfigs?.length ||
                !target.benefit.freeItem.prices?.length ||
                target.benefit.freeItem.exclusions?.length ||
                (isSalesRetail &&
                  !target.benefit.freeItem.retailConfigs?.length))
            ) {
              // skipping
              continue;
            }

            const criterion: Criterion =
              target.tag === '*'
                ? MinimumItemPurchaseCriterion.create({
                    itemId: EntityId.fromString(cartItem.itemId),
                    minQty: Quantity.create(1),
                  })
                : MinimumItemTagPurchaseCriterion.create({
                    tag: Tag.fromString(target.tag),
                    minQty: promo.tagCriteria?.tagMinQty
                      ? SalesUtil.convertQtyToBaseQty(
                          promo.tagCriteria.tagMinQty,
                          promo.tagCriteria.tagMinUomType || UomTypeEnum.BASE,
                          this.toUomConversion(itemUom[tagItemId]),
                        )
                      : Quantity.create(1),
                    tagCriteria: tagCriteria
                      ? {
                          ...tagCriteria,
                          isItemHasMatchingTag: target.itemId === '*',
                        }
                      : undefined,
                  });

            const benefit = this.tprToPromoBenefit(target);
            if (!benefit.type) continue;
            promotions.push(
              ItemPromotion.create({
                itemId: EntityId.fromString(cartItem.itemId),
                promotion: TPRPromo.create({
                  targetId: target.id,
                  priority: promo.priority,
                  targetPriority: target.priority,
                  targetTag: target.tag,
                  externalType: promo.externalType,
                  condition: PromotionConditionOneOf.create({
                    criteria: [
                      {
                        criterion,
                        benefit,
                      },
                    ],
                  }),
                }),
              }),
            );
          } else {
            const targetCriterias = target.criteria.filter((c) => c.benefit);
            if (targetCriterias.length === 0 || !targetCriterias[0].benefit)
              continue;

            const criterias: PromoCriterionWithBenefit[] = [];

            if (
              target.criteria[0].minQty !== undefined &&
              !target.criteria[0].minPurchase
            ) {
              const sortedCriteria = target.criteria
                .map((x) => {
                  const tagCriteriaMinQtyInBase =
                    promo.tagCriteria?.tagMinQty &&
                    promo.tagCriteria?.tagMinUomType
                      ? SalesUtil.convertQtyToBaseQty(
                          promo.tagCriteria.tagMinQty,
                          UomTypeEnum[promo.tagCriteria.tagMinUomType],
                          this.toUomConversion(itemUom[cartItem.itemId]),
                        ).value
                      : 0;

                  const minQtyInBase = SalesUtil.convertQtyToBaseQty(
                    x.minQty,
                    UomTypeEnum[x.minQtyUomType],
                    this.toUomConversion(itemUom[cartItem.itemId]),
                  ).value;
                  return {
                    ...x,
                    minQty: Math.max(tagCriteriaMinQtyInBase, minQtyInBase),
                    minQtyUomType: UomTypeEnum.BASE,
                  };
                })
                .sort((a, b) => a.minQty - b.minQty);

              for (const [index, criteria] of sortedCriteria.entries()) {
                // sortedCriteria.forEach((criteria, index) => {
                const benefit = this.mapTprStrataBenefit(target, criteria);
                if (!benefit.type) continue;
                criterias.push({
                  criterion: sortedCriteria[index + 1]
                    ? target.tag !== '*'
                      ? ItemTagPurchaseBetweenCriterion.create({
                          tag: Tag.fromString(target.tag),
                          from: Quantity.create(criteria.minQty),
                          to: Quantity.create(
                            sortedCriteria[index + 1].minQty - 1,
                          ),
                          tagCriteria: tagCriteria
                            ? {
                                ...tagCriteria,
                                isItemHasMatchingTag: target.itemId === '*',
                              }
                            : undefined,
                        })
                      : ItemPurchaseBetweenCriterion.create({
                          itemId: EntityId.fromString(cartItem.itemId),
                          from: Quantity.create(criteria.minQty),
                          to: Quantity.create(
                            sortedCriteria[index + 1].minQty - 1,
                          ),
                        })
                    : target.tag !== '*'
                    ? MinimumItemTagPurchaseCriterion.create({
                        tag: Tag.fromString(target.tag),
                        minQty: Quantity.create(criteria.minQty),
                        tagCriteria: tagCriteria
                          ? {
                              ...tagCriteria,
                              isItemHasMatchingTag: target.itemId === '*',
                            }
                          : undefined,
                      })
                    : MinimumItemPurchaseCriterion.create({
                        itemId: EntityId.fromString(cartItem.itemId),
                        minQty: Quantity.create(criteria.minQty),
                      }),
                  benefit,
                });
              }

              const promotion = ItemPromotion.create({
                itemId: EntityId.fromString(cartItem.itemId),
                promotion: TPRPromo.create({
                  targetId: target.id,
                  priority: promo.priority,
                  targetPriority: target.priority,
                  targetTag: target.tag,
                  externalType: promo.externalType,
                  condition: PromotionConditionOneOf.create({
                    criteria: criterias,
                  }),
                }),
              });

              promotions.push(promotion);
            } else {
              const sortedCriteria = target.criteria.sort(
                (a, b) => a.minPurchase - b.minPurchase,
              );

              for (const [index, criteria] of sortedCriteria.entries()) {
                const benefit = this.mapTprStrataBenefit(target, criteria);
                if (!benefit.type) continue;
                criterias.push({
                  criterion: sortedCriteria[index + 1]
                    ? ItemPurchaseAmountBetweenCriterion.create({
                        itemId: EntityId.fromString(cartItem.itemId),
                        from: Money.create(criteria.minPurchase),
                        to: Money.create(sortedCriteria[index + 1].minPurchase),
                      })
                    : MinimumItemPurchaseAmountCriterion.create({
                        itemId: EntityId.fromString(cartItem.itemId),
                        minPurchase: Money.create(criteria.minPurchase),
                      }),
                  benefit,
                });
              }

              const promotion = ItemPromotion.create({
                itemId: EntityId.fromString(cartItem.itemId),
                promotion: TPRPromo.create({
                  targetId: target.id,
                  priority: promo.priority,
                  targetPriority: target.priority,
                  targetTag: target.tag,
                  externalType: promo.externalType,
                  condition: PromotionConditionOneOf.create({
                    criteria: criterias,
                  }),
                }),
              });

              promotions.push(promotion);
            }
          }
        }
      }
    }

    return promotions;
  }

  private toPromoBenefitEntity(
    entity: TypeOrmPromoCMSCriteriaBenefitEntity,
    itemUom: ItemUom,
  ) {
    return PromoBenefit.create({
      type: entity.discountType === 'AMOUNT' ? 'AMOUNT' : 'PERCENTAGE',
      discount: entity.discountType
        ? MonetaryBenefit.create(
            entity.discountType === 'AMOUNT'
              ? Money.create(entity.discountValue || 0)
              : PromoPercentage.create(entity.discountValue || 0),
          )
        : undefined,
      coin: entity.coinType
        ? MonetaryBenefit.create(
            entity.coinType === 'AMOUNT'
              ? Money.create(entity.coinValue || 0)
              : PromoPercentage.create(entity.coinValue || 0),
          )
        : undefined,
      maxQty: entity.maxQty
        ? SalesUtil.convertQtyToBaseQty(
            entity.maxQty,
            entity.maxQtyUomType || UomTypeEnum.BASE,
            this.toUomConversion(itemUom),
          )
        : undefined,
      scaleQty: Quantity.create(entity.scaleQty),
      scaleUomType: entity.scaleQtyUomType,
      maxUomType: entity.maxQtyUomType,
    });
  }

  private tprToPromoBenefit(entity: TypeOrmPromoTPRTargetEntity): PromoBenefit {
    let discount: MonetaryBenefit | undefined;
    let coin: MonetaryBenefit | undefined;
    let benefitType: BenefitType | undefined;
    let freeProduct: FreeProduct | undefined;

    if (entity.benefit.benefitValue) {
      if (entity.benefit.benefitType === 'PERCENTAGE') {
        benefitType = 'PERCENTAGE';
        discount = MonetaryBenefit.create(
          PromoPercentage.create(
            entity.benefit.benefitValue *
              ((entity.benefit.discountPercentage || 100) / 100),
          ),
        );
        coin = MonetaryBenefit.create(
          PromoPercentage.create(
            entity.benefit.benefitValue *
              ((entity.benefit.coinPercentage || 0) / 100),
          ),
        );
      } else if (entity.benefit.benefitType === 'AMOUNT') {
        benefitType = 'AMOUNT';
        discount = MonetaryBenefit.create(
          Money.create(
            (entity.benefit.benefitValue / (entity.scaleQty || 1)) *
              ((entity.benefit.discountPercentage || 100) / 100),
          ),
        );
        coin = MonetaryBenefit.create(
          Money.create(
            (entity.benefit.benefitValue / (entity.scaleQty || 1)) *
              ((entity.benefit.coinPercentage || 0) / 100),
          ),
        );
      }
    } else if (entity.benefit.freeItemId) {
      benefitType = 'FREE_PRODUCT';
      freeProduct = {
        id: entity.benefit.freeItemId,
        externalId: entity.benefit.freeItem.externalId,
        name: entity.benefit.freeItem.info.name,
        qty: Quantity.create(entity.benefit.freeItemQty || 1),
        uom: entity.benefit.freeItemUomType || 'BASE',
        baseUom: {
          name: entity.benefit.freeItem.baseUom,
          packQty: PackQty.create(1),
        },
        intermediateUom: null,
        packUom:
          entity.benefit.freeItem.packQty && entity.benefit.freeItem.packUom
            ? {
                name: entity.benefit.freeItem.packUom,
                packQty: PackQty.create(entity.benefit.freeItem.packQty),
              }
            : null,
      };

      if (entity.benefit.freeItem.uoms?.length) {
        const intermediate = SalesUtil.getEffectiveBaseUom(
          '',
          entity.benefit.freeItem.uoms.map((x) => ({
            tier: SalesTier.create(x.tier),
            name: x.uom,
            qty: PackQty.create(x.packQty),
          })),
        );

        freeProduct.intermediateUom = {
          name: intermediate.name,
          packQty: intermediate.qty,
        };
      }
    }

    return PromoBenefit.create({
      type: benefitType,
      discount,
      coin,
      scaleQty: Quantity.create(entity.scaleQty),
      scaleUomType: entity.scaleUomType || UomTypeEnum.BASE,
      maxQty: entity.benefit.maxQty
        ? Quantity.create(entity.benefit.maxQty)
        : undefined,
      maxUomType: entity.benefit.maxUomType,
      freeProduct,
    });
  }

  private mapTprStrataBenefit(
    target: TypeOrmPromoTPRTargetEntity,
    criteria: TypeOrmPromoTPRCriteriaEntity,
  ): PromoBenefit {
    let discount: MonetaryBenefit | undefined;
    let coin: MonetaryBenefit | undefined;
    let benefitType: BenefitType | undefined;

    if (criteria.benefit.benefitValue) {
      if (criteria.benefit.benefitType === 'PERCENTAGE') {
        benefitType = 'PERCENTAGE';
        discount = MonetaryBenefit.create(
          PromoPercentage.create(
            criteria.benefit.benefitValue *
              ((criteria.benefit.discountPercentage || 100) / 100),
          ),
        );
        coin = MonetaryBenefit.create(
          PromoPercentage.create(
            criteria.benefit.benefitValue *
              ((criteria.benefit.coinPercentage || 0) / 100),
          ),
        );
      } else if (criteria.benefit.benefitType === 'AMOUNT') {
        benefitType = 'AMOUNT';
        discount = MonetaryBenefit.create(
          Money.create(
            (criteria.benefit.benefitValue / (target.scaleQty || 1)) *
              ((criteria.benefit.discountPercentage || 100) / 100),
          ),
        );
        coin = MonetaryBenefit.create(
          Money.create(
            (criteria.benefit.benefitValue / (target.scaleQty || 1)) *
              ((criteria.benefit.coinPercentage || 0) / 100),
          ),
        );
      }
    }

    return PromoBenefit.create({
      type: benefitType,
      discount,
      coin,
      scaleQty: Quantity.create(target.scaleQty),
      scaleUomType: target.scaleUomType,
      maxQty: criteria.benefit.maxQty
        ? Quantity.create(criteria.benefit.maxQty)
        : undefined,
      maxUomType: criteria.benefit.maxUomType,
    });
  }

  private mapItemVouchers(
    vouchers: TypeOrmCartVoucherEntity[],
  ): CheckoutItemVoucherList {
    const itemVouchers: ItemVoucher[] = [];
    for (const x of vouchers) {
      if (x.voucher.isGeneral) continue;
      if (!x.voucher.customer) continue;

      const { material } = x.voucher.customer;
      if (!material) continue;
      if (!material.matGrp2 && !material.materialId && !material.item) continue;

      itemVouchers.push(
        ItemVoucher.create(
          {
            discount: MonetaryBenefit.create(
              x.voucher.discountType === VoucherDiscountType.NOMINAL
                ? Money.create(x.voucher.amount)
                : PromoPercentage.create(x.voucher.amount),
            ),
            criteria: material.matGrp2
              ? MinimumPurchaseByTagCriterion.create({
                  tag: Tag.create({
                    key: TAG_KEY_MATERIAL_GROUP_2,
                    value: material.matGrp2,
                  }),
                  minQty: this.resolveMinimumQtyInBaseUom(
                    x.voucher.minPurchaseUom,
                    x.voucher.minPurchaseQty,
                    material.item?.packQty,
                  ),
                  minAmount: Money.create(x.voucher.minPurchaseAmount || 0),
                })
              : MinimumPurchaseByItemCriterion.create({
                  itemId: EntityId.fromString(material.item!.id),
                  minQty: this.resolveMinimumQtyInBaseUom(
                    x.voucher.minPurchaseUom,
                    x.voucher.minPurchaseQty,
                    material.item!.packQty,
                  ),
                  minAmount: Money.create(x.voucher.minPurchaseAmount || 0),
                }),
            maxDiscount: x.voucher.maxDiscount
              ? Money.create(x.voucher.maxDiscount)
              : undefined,
            appliedAt: x.createdAt,
          },
          x.voucher.rewardVoucherId,
        ),
      );
    }
    return new CheckoutItemVoucherList(itemVouchers);
  }

  private resolveMinimumQtyInBaseUom(
    minPurchaseUom: string,
    minPurchaseQty?: number,
    packQty?: number,
  ): Quantity {
    if (!minPurchaseQty) return Quantity.create(1);

    if (!LEGACY_MATERIAL_PACK_UOM.includes(minPurchaseUom) || !packQty) {
      return Quantity.create(minPurchaseQty);
    }

    return Quantity.create(minPurchaseQty * packQty);
  }

  private getItemsUom(items: TypeOrmItemEntity[]): Record<string, ItemUom> {
    const result: Record<string, ItemUom> = {};
    for (const item of items) {
      const baseUom = SalesUtil.getEffectiveBaseUom(
        item.baseUom,
        item.uoms.map((x) => ({
          tier: SalesTier.create(x.tier),
          name: x.uom,
          qty: PackQty.create(x.packQty),
        })),
      );
      result[item.id] = {
        base: {
          name: baseUom.name,
          packQty: baseUom.qty,
        },
        pack: item.packUom
          ? {
              name: item.packUom,
              packQty: PackQty.create(item.packQty || 1),
            }
          : undefined,
      };
    }
    return result;
  }

  private async mapToTagCriteria(
    tagCriteria: TypeOrmPromoTPRTagCriteriaEntity,
    identity: UserIdentity,
  ): Promise<TagCriteria> {
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
      const items = await this.uowService
        .getEntityManager()
        .createQueryBuilder(TypeOrmItemInfoEntity, 'info')
        .select(['info.itemId'])
        .innerJoin('info.item', 'item')
        .addSelect(['item.id', 'item.baseUom', 'item.packUom', 'item.packQty'])
        .leftJoinAndSelect('item.uoms', 'uoms', 'uoms.slsOffice = :slsOffice', {
          slsOffice: KeyUtil.getSalesUomKeys(identity),
        })
        .orderBy('uoms.tier', 'DESC')
        .where('info.itemId IN (:...itemIds)', {
          itemIds: tagCriteria.includedItemIds,
        })
        .getMany();
      items.forEach((x) => {
        criteria.items.push({
          id: x.itemId,
        });
      });
    }

    return criteria;
  }

  private isSimulatedPriceValid(simulatedAt?: Date, updatedAt?: Date): boolean {
    if (!simulatedAt || !updatedAt) return false;
    return (
      simulatedAt >= updatedAt &&
      DateTime.fromJSDate(simulatedAt).hasSame(DateTime.now(), 'day')
    );
  }

  private toUomConversion(itemUom: ItemUom): UomConversion {
    return {
      base: itemUom.base.packQty,
      pack: itemUom.pack?.packQty,
    };
  }

  private async toAggregate<
    TAggregate = ICartVoucherAggregate | ICheckoutAggregate,
  >(
    identity: UserIdentity,
    entities: TypeOrmCartEntity[],
  ): Promise<TAggregate[]> {
    const itemsUoms = this.getItemsUom(
      entities.flatMap((entity) => entity.items).map((item) => item.item),
    );
    const allTags = entities
      .flatMap((entity) => entity.tags)
      .map((tag) => tag.tag.toString());
    const items = entities.flatMap((entity) => entity.items);
    const [
      allFlashsale,
      allRegularPromotion,
      allTprPromotion,
      dryMinPurchaseAmount,
      frozenMinPurchaseAmount,
    ] = await Promise.all([
      this.getItemFlashSale(identity, itemsUoms),
      this.getItemRegularPromotions(identity, itemsUoms, allTags),
      this.getItemTPRPromotions(identity, allTags, items),
      this.getCartMinimumPurchase(identity, 'DRY'),
      this.getCartMinimumPurchase(identity, 'FROZEN'),
    ]);

    const lifetimePromotionExternalType = this.parameterService.getOne(
      ParameterKeys.LIFETIME_PROMOTION_EXTERNAL_TYPE,
    )?.value;

    return entities.map((entity) => {
      const minPurchaseAmount =
        entity.type === 'DRY' ? dryMinPurchaseAmount : frozenMinPurchaseAmount;
      const generalVoucher = entity.vouchers.find((x) => x.voucher.isGeneral);

      const itemsUom = this.getItemsUom(entity.items.map((x) => x.item));

      const tags = entity.tags.map((tag) => tag.tag.toString());

      const isSimulatedPriceValid = this.isSimulatedPriceValid(
        entity.simulatedAt,
        entity.updatedAt,
      );
      const flashsales = allFlashsale.filter(
        (fs) => !!itemsUom[fs.itemId.value],
      );
      const regularPromotions = allRegularPromotion.filter(
        (rp) =>
          !!itemsUom[rp.itemId.value] &&
          (!(rp.promotion as RegularPromo).tag ||
            tags.find(
              (tag) => tag === (rp.promotion as RegularPromo).tag?.toString(),
            )),
      );
      const tprPromotions: ItemRegularPromotions[] = [];
      const lifetimePromotions: ItemLifetimePromotion[] = [];

      allTprPromotion.map((tp) => {
        if (
          !!itemsUom[tp.itemId.value] &&
          tags.find(
            (tag) =>
              (tp.promotion as TPRPromo).targetTag === '*' ||
              tag === (tp.promotion as TPRPromo).targetTag,
          )
        ) {
          if (
            (tp.promotion as TPRPromo).externalType ===
            lifetimePromotionExternalType
          ) {
            lifetimePromotions.push(tp as ItemLifetimePromotion);
          } else {
            tprPromotions.push(tp);
          }
        }
      });

      const aggregate = this.factory.reconstitute(
        {
          type: entity.type as CartType,
          identity,
          deliveryAddressId: entity.deliveryAddressId
            ? EntityId.fromString(entity.deliveryAddressId)
            : null,
          minimumTotalAmount: minPurchaseAmount,
          itemFlashSale: flashsales,
          itemRegularPromotions: regularPromotions.concat(tprPromotions),
          itemLifetimePromotions: lifetimePromotions,
          // TODO: need to auto-remove inactive or excluded items?
          items: entity.items.map((item) => {
            let recommendationType: Nullable<RecommendationType> = null;
            if (item.item.recommendationCs) {
              recommendationType = RecommendationType.CrossSales;
            } else if (item.item.recommendationUs) {
              recommendationType = RecommendationType.UpSales;
            }

            const itemPrice = this.getItemPrice(item.item.prices);

            const checkOutItem = CheckoutItem.create({
              itemId: EntityId.fromString(item.itemId),
              externalId: EntityId.fromString(item.item.externalId),
              itemName: item.item.info.name || '',
              qty: Quantity.create(item.qty),
              price: itemPrice,
              salesFactor: SalesUtil.getEffectiveSalesFactor(
                item.item.salesFactors.map((salesFactor) => {
                  return SalesItemFactor.create(
                    SalesTier.create(salesFactor.tier),
                    SalesFactor.create(salesFactor.factor),
                  );
                }),
              ),
              tags:
                item.item.salesConfigs[0].tags.map((tag) =>
                  Tag.fromString(tag),
                ) || [],
              description: item.item.info.name || null,
              baseUom: itemsUoms[item.itemId].base,
              packUom: itemsUoms[item.itemId].pack || null,
              recommendationType: recommendationType,
              isBaseSellable: true,
              isPackSellable: !item.item.packUom,
              addedAt: item.createdAt,
              simulatedPrice:
                isSimulatedPriceValid && item.simulatedPrice
                  ? {
                      subtotal: Money.create(item.simulatedPrice.subtotal),
                      flashSaleDiscount: Money.create(
                        item.simulatedPrice.flashSaleDiscount,
                      ),
                      regularDiscount: Money.create(
                        item.simulatedPrice.regularDiscount,
                      ),
                      lifetimeDiscount: Money.create(
                        item.simulatedPrice.lifetimeDiscount,
                      ),
                    }
                  : undefined,
            });
            return checkOutItem;
          }),
          generalVoucher: generalVoucher
            ? new WatchedProps(
                GeneralVoucher.create(
                  {
                    minPurchase: Money.create(
                      generalVoucher.voucher.minPurchaseAmount,
                    ),
                    maxDiscount: generalVoucher.voucher.maxDiscount
                      ? Money.create(generalVoucher.voucher.maxDiscount)
                      : undefined,
                    discount: MonetaryBenefit.create(
                      generalVoucher.voucher.discountType ===
                        VoucherDiscountType.NOMINAL
                        ? Money.create(generalVoucher.voucher.amount)
                        : PromoPercentage.create(generalVoucher.voucher.amount),
                    ),
                    appliedAt: generalVoucher.createdAt,
                  },
                  generalVoucher.voucher.rewardVoucherId,
                ),
              )
            : undefined,
          itemVouchers: this.mapItemVouchers(entity.vouchers),
        },
        entity.id,
      ) as TAggregate;

      return aggregate;
    });
  }
}
