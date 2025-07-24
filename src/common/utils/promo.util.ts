import { Nullable } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { PackQty } from '@wings-online/cart/domains';
import { ItemPromoCriteria } from '@wings-online/cart/promotion';
import { PromotionBenefit } from '@wings-online/product-catalog/read-models';

import {
  Criterion,
  MinimumPurchaseAmountCriterion,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
  PurchaseAmountBetweenCriterion,
  PurchaseQtyBetweenByTagCriterion,
  PurchaseQtyBetweenCriterion,
} from '../criterion';
import {
  BenefitType,
  MonetaryBenefit,
  PercentageBenefit,
  TagCriteria,
  UomConversion,
  ValueBenefit,
} from '../interfaces';
import { Purchase, TagPurchase } from '../interfaces/purchase.interface';
import { SalesUtil } from './sales.util';

export class PromoUtil {
  /**
   *
   * @param benefit
   * @param price
   * @returns
   */
  public static resolveMonetaryBenefit(
    benefit: MonetaryBenefit,
    price: Money,
    conversion?: {
      baseQty: Quantity;
      packQty: Quantity;
    },
  ): Money {
    if (benefit.type === 'PERCENTAGE') {
      return PromoUtil.resolvePercentageBenefit(benefit, price);
    } else {
      if (!conversion) {
        return benefit.value;
      } else {
        return PromoUtil.resolveAmountBenefit(benefit, conversion);
      }
    }
  }

  public static resolvePercentageBenefit(
    benefit: PercentageBenefit,
    price: Money,
  ): Money {
    return Money.fromPercentage(benefit.value, price);
  }

  public static resolveAmountBenefit(
    benefit: ValueBenefit,
    conversion: {
      baseQty: Quantity;
      packQty: Quantity;
    },
  ): Money {
    if (benefit.scaleUomType === UomTypeEnum.BASE) {
      return Money.create(benefit.value.value);
    } else if (benefit.scaleUomType === UomTypeEnum.PACK) {
      return Money.create(benefit.value.value / conversion.packQty.value);
    } else {
      return Money.create(benefit.value.value / conversion.baseQty.value);
    }
  }

  public static resolveOfferedPrice(price: Money, discount: Money): Money {
    return discount.gt(price) ? Money.zero() : price.subtract(discount);
  }

  public static isCriteriaContainUomType(
    criteria: ItemPromoCriteria[],
    uomType: UomTypeEnum,
  ): boolean {
    return criteria.some((c) => {
      if (c['benefit'] && c['benefit'].maxUomType === uomType) {
        return true;
      }

      if (
        c.criterion instanceof MinimumPurchaseQtyCriterion ||
        c.criterion instanceof PurchaseQtyBetweenCriterion ||
        c.criterion instanceof MinimumPurchaseQtyByTagCriterion ||
        c.criterion instanceof PurchaseQtyBetweenByTagCriterion
      ) {
        return c.criterion.uomType === uomType;
      }
      return false;
    });
  }

  public static isBenefitCombineable(
    a: PromotionBenefit,
    b: PromotionBenefit,
  ): boolean {
    return a.maxQty === b.maxQty && a.maxUomType === b.maxUomType;
  }

  /**
   *
   * @param price
   * @param benefit
   * @returns
   */
  public static resolvePromotionBenefit(
    benefit: {
      type: BenefitType;
      value: number;
      coinPercentage?: number;
      discountPercentage?: number;
      maxQty?: number;
      maxUomType?: UomType;
      coinType?: BenefitType;
      coinValue?: number;
    },
    scale: {
      qty: number;
      uom: UomType;
    },
    freeProduct?: {
      id: string;
      name: Nullable<string>;
      benefitQty: number;
      benefitUom: UomType;
      uom: {
        base: UomType;
        baseQty: PackQty;
        intermediate: Nullable<UomType>;
        intermediateQty: Nullable<PackQty>;
        pack: Nullable<UomType>;
        packQty: Nullable<PackQty>;
      };
    },
  ): PromotionBenefit {
    if (benefit.type === 'PERCENTAGE' && benefit.value !== undefined) {
      const coinType = benefit.coinType || benefit.type;
      const coinValue =
        benefit.coinValue ||
        (benefit.coinPercentage && benefit.coinPercentage > 0
          ? (benefit.value * benefit.coinPercentage) / 100
          : 0) ||
        0;

      const discountPercentage =
        benefit.discountPercentage !== undefined
          ? (benefit.value * benefit.discountPercentage) / 100
          : benefit.value;

      return {
        discount:
          discountPercentage > 0
            ? [
                {
                  type: 'PERCENTAGE',
                  value: discountPercentage,
                },
              ]
            : [],
        coin: [
          {
            type: coinType as 'PERCENTAGE',
            value: coinValue,
          },
        ],
        product: null,
        maxQty: benefit.maxQty,
        maxUomType: benefit.maxUomType,
      };
    } else if (freeProduct) {
      return {
        discount: [],
        coin: [],
        product: {
          type: 'FREE_PRODUCT',
          id: freeProduct.id,
          name: freeProduct.name,
          scaleQty: scale.qty,
          scaleUomType: scale.uom,
          benefitQty: freeProduct.benefitQty,
          benefitUom: freeProduct.benefitUom,
          uom: {
            base: freeProduct.uom.base,
            baseQty: freeProduct.uom.baseQty,
            intermediate: freeProduct.uom.intermediate,
            intermediateQty: freeProduct.uom.intermediateQty,
            pack: freeProduct.uom.pack,
            packQty: freeProduct.uom.packQty,
          },
        },
        maxQty: benefit.maxQty,
        maxUomType: benefit.maxUomType,
      };
    } else {
      const scaleQty = scale.qty || 1;
      const coinType = benefit.coinType || benefit.type;
      const coinValue =
        (benefit.coinValue ||
          (benefit.coinPercentage && benefit.coinPercentage > 0
            ? (benefit.value * benefit.coinPercentage) / 100
            : 0) ||
          0) / scaleQty;

      return {
        discount: [
          {
            type: benefit.type as 'AMOUNT',
            value:
              (benefit.value / scale.qty) *
              (benefit.discountPercentage !== undefined
                ? benefit.discountPercentage / 100
                : 1),
            scaleUomType: scale.uom,
          },
        ],
        coin: [
          {
            type: coinType as 'AMOUNT' | 'PERCENTAGE',
            value: coinValue,
            scaleUomType: scale.uom,
          },
        ],
        product: null,
        maxQty: benefit.maxQty,
        maxUomType: benefit.maxUomType,
      };
    }
  }

  public static isAmountCriterion(criterion: Criterion<any, any>): boolean {
    return (
      criterion instanceof MinimumPurchaseAmountCriterion ||
      criterion instanceof PurchaseAmountBetweenCriterion
    );
  }

  public static isTagCriteriaMet({
    tagCriteria,
    tagPurchase,
    itemsPurchase,
    uomConversion,
    includedTagPurchase,
  }: IsTagCriteriaMetProps): boolean {
    // Validate tag minimum quantity criteria
    const tagMinQty = uomConversion
      ? SalesUtil.convertQtyToBaseQty(
          tagCriteria.minQty,
          tagCriteria.minUomType,
          uomConversion,
        ).value
      : tagCriteria.minQty;

    if (!tagPurchase.qty.gte(Quantity.create(tagMinQty))) {
      return false;
    }

    // Validate included tag minimum quantity criteria
    const includedTagPurchaseQty = includedTagPurchase?.qty || Quantity.zero();
    const includedTagMinQty = includedTagPurchase
      ? uomConversion
        ? SalesUtil.convertQtyToBaseQty(
            tagCriteria.includedTagMinQty,
            tagCriteria.includedTagMinUomType,
            uomConversion,
          ).value
        : tagCriteria.includedTagMinQty
      : 0;

    if (!includedTagPurchaseQty.gte(Quantity.create(includedTagMinQty))) {
      return false;
    }

    // Validate the minimum number of items must be purchased
    const purchasedItemCombination = tagPurchase.items.length;
    if (purchasedItemCombination < tagCriteria.minItemCombination) {
      return false;
    }

    // Validate included items criteria
    const includedItemMinQtyInBase = uomConversion
      ? SalesUtil.convertQtyToBaseQty(
          tagCriteria.itemMinQty,
          tagCriteria.itemMinUomType,
          uomConversion,
        ).value
      : tagCriteria.itemMinQty;

    // Ensure all required included items meet the minimum quantity criteria
    if (
      tagCriteria.items.some((item) => {
        const itemCartQty = itemsPurchase[item.id]?.qty || Quantity.zero();
        return !itemCartQty.gte(Quantity.create(includedItemMinQtyInBase));
      })
    ) {
      return false;
    }

    const nOtherVariants =
      tagCriteria.minItemCombination - tagCriteria.items.length;

    if (nOtherVariants > 0) {
      // Ensure at least N other variants exceed the minimum quantity
      const eligibleOtherVariants = tagPurchase.items.filter(
        (item) =>
          !tagCriteria.items.some((x) => x.id === item.itemId) &&
          item.qty.value >= includedItemMinQtyInBase,
      ).length;

      if (eligibleOtherVariants < nOtherVariants) {
        return false;
      }
    }

    // Special validation for ratio-based promo
    if (tagCriteria.isRatioBased) {
      const tagMinQtyInBase = Quantity.create(
        tagCriteria.minQty *
          ((tagCriteria.minUomType === UomTypeEnum.PACK
            ? uomConversion?.pack?.value
            : tagCriteria.minUomType === UomTypeEnum.INTERMEDIATE
            ? uomConversion?.base.value
            : 1) || 1),
      );

      if (tagCriteria.isItemHasMatchingTag) {
        // validate if items purchase that are not included in the must included items (the other variant) is not less than the min qty
        const itemsTotalQty = Quantity.create(
          tagCriteria.items.reduce((acc, item) => {
            return acc + (itemsPurchase[item.id]?.qty.value || 0);
          }, 0),
        );
        const otherVariantQty = tagPurchase.qty.subtract(itemsTotalQty);
        if (otherVariantQty.lt(tagMinQtyInBase)) {
          return false;
        }
      }

      if (tagCriteria.includedTag && includedTagPurchase) {
        // validate if items purchase that are not included in the must included tag is not less than the min qty
        let nonIncludedTagQty = Quantity.zero();
        tagPurchase.items.forEach((itemPurchase) => {
          const isIncludedTagItem = includedTagPurchase.items.some(
            (x) => x.itemId === itemPurchase.itemId,
          );

          if (!isIncludedTagItem) {
            nonIncludedTagQty = nonIncludedTagQty.add(itemPurchase.qty);
          }
        });

        if (nonIncludedTagQty.lt(tagMinQtyInBase)) {
          return false;
        }
      }
    }

    return true;
  }
}

type IsTagCriteriaMetProps = {
  tagCriteria: TagCriteria & {
    minQty: number;
    minUomType: UomType;
  };
  tagPurchase: TagPurchase;
  itemsPurchase: Record<string, Purchase>;
  uomConversion?: UomConversion;
  includedTagPurchase?: TagPurchase;
};
