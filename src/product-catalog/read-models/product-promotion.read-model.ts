import { cloneDeep, orderBy, sumBy, uniq } from 'lodash';

import { Nullable } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';
import { BenefitType } from '@wings-online/common';

import { UomTypeEnum } from '../promotion';
import { ProductPromotionReadModelUtil } from '../utils';
import { PromoUtils } from '../utils/promo.util';
import { ProductReadModel } from './product.read-model';
import {
  DirectPromotionReadModel,
  isDirectPromotion,
  isMinimumPurchaseAmountCondition,
  isMinimumPurchaseCondition,
  MinimumPurchaseAmountCondition,
  MinimumPurchaseCondition,
  PromotionReadModel,
  StrataQtyPromotionReadModel,
} from './promotion.read-model';
import { CartQuantity } from './qty-in-cart.read-model';

type PriceInfo = {
  listed: number;
  offered: number;
  discounted: number;
};

type TagQty = {
  base: number;
  item_combination: number;
  previous_qty: number;
};

type PromotionBenefit = {
  discount: Nullable<{
    values: Array<{
      type: BenefitType;
      value: number;
    }>;
  }>;
  coin: Nullable<{
    values: Array<{
      type: BenefitType;
      value: number;
    }>;
    amount: number;
  }>;
  product: Nullable<{
    type: BenefitType;
    id: string;
    name: string;
    benefit_qty: number;
    benefit_uom: UomType;
    scale_qty: number;
    scale_uom_type: UomType;
    uom: {
      base: string;
      base_qty: number;
      intermediate: Nullable<string>;
      intermediate_qty: Nullable<number>;
      pack: Nullable<string>;
      pack_qty: Nullable<number>;
    };
  }>;
  maximum: {
    qty: number | null;
    uom_type: UomType | null;
  };
};

export type JsonProductPromotionReadModelProps = {
  ids: Array<string>;
  external_id?: string;
  priorities: Array<number>;
  type: 'DIRECT' | 'STRATA';
  is_regular: boolean;
  is_applied: boolean;
  is_combination: boolean;
  tag: Nullable<string>;
  brands: string[];
  tag_qty: Nullable<TagQty>;
  conditions?: Array<{
    is_condition_met: boolean;
    priorities: Array<number>;
    min_qty?: number;
    min_qty_uom_type?: UomType;
    min_purchase?: number;
    benefit: PromotionBenefit;
    price: {
      base: PriceInfo;
      pack: Nullable<PriceInfo>;
    };
  }>;
  benefit?: PromotionBenefit;
  price?: {
    base: PriceInfo;
    pack: Nullable<PriceInfo>;
  };
  tag_criteria: Nullable<{
    min_qty: number;
    min_qty_uom_type: UomType;
    min_item_combination: number;
    item_min_qty: number;
    item_min_qty_uom_type: UomType;
    item_has_matching_tag: boolean;
    included_tag: Nullable<string>;
    included_tag_brands: string[];
    included_tag_min_qty: number;
    included_tag_min_qty_uom_type: UomType;
    included_tag_qty: Nullable<TagQty>;
    is_ratio_based: boolean;
    items: {
      id: string;
      name: Nullable<string>;
      min_qty_uom: string;
      qty: number;
    }[];
  }>;
};

export class ProductPromotionReadModel {
  private _promotions: PromotionReadModel[] = [];
  private product: ProductReadModel;

  constructor(product: ProductReadModel) {
    this.product = product;
  }

  get includeRegularPromotion() {
    return this.promotions.some(
      (x) => x instanceof DirectPromotionReadModel && x.isRegular,
    );
  }

  public addPromotion(promotion: PromotionReadModel) {
    if (!this.isPromoUomMatch(promotion)) return;
    const existingPromotionIndex = this._promotions.findIndex(
      (x) => x.priority === promotion.priority,
    );

    const newPromotion = cloneDeep(promotion);
    if (newPromotion instanceof StrataQtyPromotionReadModel) {
      // add product uom conversion information
      newPromotion.setUomConversion({
        base: this.product.baseQty,
        pack: this.product.packQty,
      });
    }

    if (existingPromotionIndex === -1) {
      this._promotions.push(newPromotion);
    } else {
      // if promotion with the same priority already exists, replace it only if the new promotion's target has higher priority (lower value)
      if (
        this._promotions[existingPromotionIndex].target.priority >
        promotion.target.priority
      ) {
        this._promotions[existingPromotionIndex] = newPromotion;
      }
    }
  }

  get promotions(): PromotionReadModel[] {
    return this._promotions.filter((promotion) => {
      if (promotion instanceof DirectPromotionReadModel) {
        if (
          !promotion.benefit.product &&
          (!promotion.condition.benefit.discount.length ||
            promotion.condition.benefit.discount.some(
              (discount) => discount.value === 0,
            ))
        ) {
          return false;
        }
      } else if (
        promotion.conditions.some(
          (c: MinimumPurchaseCondition | MinimumPurchaseAmountCondition) =>
            !c.benefit.product &&
            (!c.benefit.discount.length ||
              c.benefit.discount.some((d) => d.value === 0)),
        )
      ) {
        return false;
      }

      return true;
    });
  }

  get sortedPromotions(): PromotionReadModel[] {
    return this.promotions.sort((a, b) => a.priority - b.priority);
  }

  get discountAmount(): Money {
    let totalDiscount = Money.zero();
    const basePrice = this.priceBeforeDiscount;
    let price = basePrice;

    for (const promotion of this.sortedPromotions) {
      const discount = ProductPromotionReadModelUtil.calculatePromotionDiscount(
        promotion,
        price,
        this.product,
      );

      totalDiscount = totalDiscount.add(discount);
      if (totalDiscount.gte(basePrice)) {
        return basePrice;
      }
      price = price.subtract(discount);
    }

    return totalDiscount;
  }

  get qty(): Quantity {
    const flashSaleQty = this.product.flashSale.isStarted
      ? this.product.flashSale.discountedQty
      : Quantity.zero();
    return this.product.cartQty.subtract(flashSaleQty);
  }

  get productId(): string {
    return this.product.id;
  }

  get mergedPromotions(): PromotionReadModel[] {
    return this.sortedPromotions.reduce<PromotionReadModel[]>(
      (array, current) => {
        const originalArray = [...array];
        for (let i = 0; i < originalArray.length; i++) {
          const a = array[i];
          const b = current;
          const merged = a.tryCombine(b);
          if (merged) {
            originalArray.splice(i, 1, merged);
            return originalArray;
          }
        }
        array.push(current);

        return array;
      },
      [],
    );
  }

  get priceBeforeDiscount() {
    return this.product.price.subtract(
      this.product.lifetimePromotion?.discountAmount || Money.zero(),
    );
  }

  toJSON(): JsonProductPromotionReadModelProps[] {
    let coinPrice = this.priceBeforeDiscount;
    const responseProps = this.mergedPromotions.map((promotion) => {
      let discount = Money.create(0);

      const isTag = promotion.target.tag !== '*';
      const tag = isTag
        ? this.product.qtyInCart.byTag(Tag.fromString(promotion.target.tag))
        : null;

      if (isDirectPromotion(promotion)) {
        const price = this.priceBeforeDiscount;
        const basePrice = price.multiply(this.product.baseQty);
        const packPrice = price.multiply(this.product.packQty);

        const discountBenefits = promotion.benefit.discount;
        const coinBenefit = promotion.benefit.coin;

        discount =
          ProductPromotionReadModelUtil.calculateDirectPromotionDiscount(
            promotion,
            price,
            this.product,
          );
        const baseDiscount = discount.multiply(this.product.baseQty);
        const packDiscount = discount.multiply(this.product.packQty);
        const coinAmount =
          ProductPromotionReadModelUtil.calculateDirectPromotionCoin(
            promotion,
            coinPrice,
            this.product,
          );
        coinPrice = coinPrice.subtract(coinAmount);

        return {
          ids: uniq(promotion.condition.promotionIds),
          external_id: promotion.externalId,
          priorities: uniq(promotion.condition.priorities),
          type: promotion.type,
          is_regular: promotion.isRegular,
          is_applied: ProductPromotionReadModelUtil.isPromotionApplied(
            promotion,
            this.product,
            this.qty,
          ),
          is_combination: isTag,
          tag: isTag ? promotion.target.tag : null,
          tag_qty: this.getTagQuantity(tag),
          tag_criteria: tag ? this.mapToJSONTagCriteria(promotion) : null,
          brands: promotion.target.brands || [],
          benefit: {
            discount: !promotion.benefit.product
              ? {
                  values: discountBenefits.map((x) => ({
                    type: x.type,
                    value: x.value,
                    uom_type: x.type === 'PERCENTAGE' ? null : x.scaleUomType,
                  })),
                }
              : null,
            coin: !promotion.benefit.product
              ? {
                  values: coinBenefit.map((x) => ({
                    type: x.type,
                    value: x.value,
                    uom_type: x.type === 'PERCENTAGE' ? null : x.scaleUomType,
                  })),
                  amount: coinAmount.value,
                }
              : null,
            product: promotion.benefit.product
              ? {
                  type: 'FREE_PRODUCT',
                  id: promotion.benefit.product.id,
                  name: promotion.benefit.product.name,
                  benefit_qty: promotion.benefit.product.benefitQty,
                  benefit_uom: promotion.benefit.product.benefitUom,
                  scale_qty: promotion.benefit.product.scaleQty,
                  scale_uom_type: promotion.benefit.product.scaleUomType,
                  uom: {
                    base: promotion.benefit.product.uom.base,
                    base_qty: promotion.benefit.product.uom.baseQty.value,
                    intermediate: promotion.benefit.product.uom.intermediate,
                    intermediate_qty:
                      promotion.benefit.product.uom.intermediateQty?.value ||
                      null,
                    pack: promotion.benefit.product.uom.pack,
                    pack_qty:
                      promotion.benefit.product.uom.packQty?.value || null,
                  },
                }
              : null,
            maximum: {
              qty: promotion.benefit?.maxQty || null,
              uom_type: promotion.benefit?.maxUomType,
            },
          },
          price: !promotion.benefit.product
            ? {
                base: {
                  listed: basePrice.value,
                  offered: Math.ceil(basePrice.value - baseDiscount.value),
                  discounted: baseDiscount.value,
                },
                pack: this.product.hasPackUom
                  ? {
                      listed: packPrice.value,
                      offered: Math.ceil(packPrice.value - packDiscount.value),
                      discounted: packDiscount.value,
                    }
                  : null,
              }
            : null,
        } as JsonProductPromotionReadModelProps;
      } else {
        const price = this.priceBeforeDiscount;
        const basePrice = price.multiply(this.product.baseQty);
        const packPrice = price.multiply(this.product.packQty);
        const promotionIds: Array<string> = [];
        const priorities: Array<number> = [];
        const conditions = promotion.conditions.map(
          (
            condition:
              | MinimumPurchaseCondition
              | MinimumPurchaseAmountCondition,
          ) => {
            // reset discount per condition
            discount =
              ProductPromotionReadModelUtil.calculateStrataConditionDiscount(
                condition,
                price,
                this.product,
              );
            const discountBenefits = condition.benefit.discount;
            const coinBenefits = condition.benefit.coin;

            const baseDiscount = discount.multiply(this.product.baseQty);
            const packDiscount = discount.multiply(this.product.packQty);
            const coinAmount =
              ProductPromotionReadModelUtil.calculateStrataConditionCoin(
                condition,
                coinPrice,
                this.product,
              );

            const criteria = isMinimumPurchaseCondition(condition)
              ? {
                  min_qty: condition.minQty,
                  min_qty_uom_type: condition.minQtyUomType,
                }
              : {
                  min_purchase: condition.minAmount,
                };

            promotionIds.push(...condition.promotionIds);
            priorities.push(...condition.priorities);
            return {
              is_condition_met:
                !this.qty.equals(Quantity.zero()) &&
                ProductPromotionReadModelUtil.isConditionMet(
                  promotion.target,
                  condition,
                  this.product,
                ),
              priorities: condition.priorities,
              ...criteria,
              benefit: {
                discount: {
                  values: discountBenefits.map((x) => ({
                    type: x.type,
                    value: x.value,
                    uom_type: x.type === 'PERCENTAGE' ? null : x.scaleUomType,
                  })),
                },
                maximum: {
                  qty: condition.benefit.maxQty || null,
                  uom_type: condition.benefit.maxUomType || null,
                },
                coin: {
                  values: coinBenefits.map((x) => ({
                    type: x.type,
                    value: x.value,
                    uom_type: x.type === 'PERCENTAGE' ? null : x.scaleUomType,
                  })),
                  amount: coinAmount.value,
                },
                product: null,
              },
              price: {
                base: {
                  listed: basePrice.value,
                  offered: Math.ceil(basePrice.value - baseDiscount.value),
                  discounted: baseDiscount.value,
                },
                pack: this.product.hasPackUom
                  ? {
                      listed: packPrice.value,
                      offered: Math.ceil(packPrice.value - packDiscount.value),
                      discounted: packDiscount.value,
                    }
                  : null,
              },
            };
          },
        );

        // if strata: use highest condition to substract coin price
        const highestCoinAmount =
          ProductPromotionReadModelUtil.calculateStrataConditionCoin(
            promotion.highestCondition,
            coinPrice,
            this.product,
          );
        coinPrice = coinPrice.subtract(highestCoinAmount);

        return {
          ids: uniq(promotionIds),
          priorities: uniq(priorities.sort()),
          type: promotion.type,
          is_applied: ProductPromotionReadModelUtil.isPromotionApplied(
            promotion,
            this.product,
            this.qty,
          ),
          is_combination: isTag,
          is_regular: promotion.isRegular,
          tag: isTag ? promotion.target.tag : null,
          tag_qty: this.getTagQuantity(tag),
          brands: promotion.target.brands || [],
          tag_criteria: this.mapToJSONTagCriteria(promotion),
          conditions,
        };
      }
    });

    return this.sortJsonProductPromotionProps(responseProps);
  }

  private getTagQuantity(tag: Nullable<CartQuantity>): Nullable<TagQty> {
    if (!tag) return null;

    const addedAt = this.product.addedToCartAt || new Date();
    return {
      base: tag.qty.value,
      item_combination: tag.items.length,
      previous_qty: sumBy(
        tag.items.filter((i) => i.addedAt < addedAt),
        (i) => i.qty.value,
      ),
    };
  }

  private mapToJSONTagCriteria(promotion: PromotionReadModel) {
    const condition = isDirectPromotion(promotion)
      ? promotion.condition
      : promotion.conditions[0];
    if (isMinimumPurchaseAmountCondition(condition)) return null;

    const { tagCriteria } = condition;
    if (!tagCriteria) return null;

    const includedTagQty = tagCriteria.includedTag
      ? this.product.qtyInCart.byTag(tagCriteria.includedTag)
      : null;

    return {
      min_qty: condition.minQty,
      min_qty_uom_type: condition.minQtyUomType,
      min_item_combination: tagCriteria.minItemCombination,
      item_min_qty: tagCriteria.itemMinQty,
      item_min_qty_uom_type: tagCriteria.itemMinUomType,
      item_has_matching_tag: tagCriteria.isItemHasMatchingTag,
      included_tag: tagCriteria.includedTag?.toString() || null,
      included_tag_brands: tagCriteria.includedTagBrands!,
      included_tag_min_qty: tagCriteria.includedTagMinQty,
      included_tag_min_qty_uom_type: tagCriteria.includedTagMinUomType,
      included_tag_qty: this.getTagQuantity(includedTagQty),
      is_ratio_based: tagCriteria.isRatioBased,
      items: tagCriteria.items.map((x) => {
        const itemQty = this.product.qtyInCart.byItem(x.id);
        return {
          id: x.id,
          name: x.name || null,
          min_qty_uom:
            (tagCriteria.itemMinUomType === UomTypeEnum.PACK
              ? x.uom?.pack
              : tagCriteria.itemMinUomType === UomTypeEnum.INTERMEDIATE
              ? x.uom?.intermediate
              : x.uom?.base) || '',
          qty: itemQty?.qty.value || 0,
        };
      }),
    };
  }

  sortJsonProductPromotionProps(
    props: JsonProductPromotionReadModelProps[],
  ): JsonProductPromotionReadModelProps[] {
    const result: JsonProductPromotionReadModelProps[] = [];

    const sortingCriteria: JsonProductPromotionReadModelSortCriteriaProps[] =
      props.map((jsonProp, index) => {
        let minQty = 1;
        let values = 0;
        let uom: UomType = 'BASE';
        const hasTagCriteria = !!jsonProp.tag_criteria;
        // if strata, get min qty & values from condition
        if (jsonProp.conditions && jsonProp.conditions.length > 0) {
          // get minqty from smallest condition
          const sortProps = orderBy(
            jsonProp.conditions.map((x) => ({
              qty:
                x.min_qty ||
                Math.ceil((x.min_purchase || 1) / this.product.price.value),
              uom: x.min_qty_uom_type || UomTypeEnum.BASE,
            })),
            ['uom', 'qty'],
            ['asc', 'asc'],
          )[0];

          minQty = sortProps.qty;
          uom = sortProps.uom;
          // get values from largest discounted price condition
          values = jsonProp.conditions
            .map((json) => json.price.base.discounted)
            .sort((a, b) => b - a)[0];
        } else {
          if (jsonProp.benefit?.product) {
            minQty = jsonProp.benefit.product.scale_qty;
            uom = jsonProp.benefit.product.scale_uom_type;
          } else if (jsonProp.price) {
            values = jsonProp.price.base.discounted;
          }
        }

        return {
          index,
          is_applied: jsonProp.is_applied,
          is_regular: jsonProp.is_regular,
          is_free_product: jsonProp.benefit?.product ? true : false,
          has_tag_criteria: hasTagCriteria,
          min_qty: minQty,
          values,
          uom,
        };
      });

    const sortedCriteria = orderBy(
      sortingCriteria,
      [
        'is_applied',
        'is_regular',
        'is_free_product',
        'has_tag_criteria',
        'uom',
        'min_qty',
        'values',
      ],
      ['desc', 'desc', 'desc', 'asc', 'asc', 'asc', 'asc'],
    );

    for (const sortCriteria of sortedCriteria) {
      result.push(props[sortCriteria.index]);
    }
    return result;
  }

  private isPromoUomMatch(promo: PromotionReadModel): boolean {
    if (promo.isRegular) {
      return true;
    } else {
      if (isDirectPromotion(promo)) {
        if (
          (promo.benefit.product?.scaleUomType === UomTypeEnum.INTERMEDIATE ||
            (promo.benefit.discount[0]?.type === 'AMOUNT' &&
              promo.benefit.discount[0]?.scaleUomType ===
                UomTypeEnum.INTERMEDIATE) ||
            (!promo.benefit.product &&
              promo.benefit.maxUomType === UomTypeEnum.INTERMEDIATE)) &&
          !this.product.hasIntermediateUoM
        ) {
          return false;
        }

        if (
          (promo.benefit.product?.scaleUomType === UomTypeEnum.PACK ||
            (promo.benefit.discount[0]?.type === 'AMOUNT' &&
              promo.benefit.discount[0]?.scaleUomType === UomTypeEnum.PACK) ||
            (!promo.benefit.product &&
              promo.benefit.maxUomType === UomTypeEnum.PACK)) &&
          !this.product.hasPackUom
        ) {
          return false;
        }

        return true;
      } else {
        if (
          PromoUtils.isCriteriaContainUomType(
            promo.conditions,
            UomTypeEnum.INTERMEDIATE,
          ) &&
          !this.product.hasIntermediateUoM
        ) {
          return false;
        }

        if (
          PromoUtils.isCriteriaContainUomType(
            promo.conditions,
            UomTypeEnum.PACK,
          ) &&
          !this.product.hasPackUom
        ) {
          return false;
        }

        return true;
      }
    }
  }
}

type JsonProductPromotionReadModelSortCriteriaProps = {
  index: number;
  is_applied: boolean;
  is_regular: boolean;
  is_free_product: boolean;
  min_qty: number;
  values: number;
  uom: UomType;
};
