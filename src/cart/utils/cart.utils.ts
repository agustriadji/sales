import { EntityId, Money } from '@wings-corporation/domain';
import {
  MinimumPurchaseAmountCriterion,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
  PurchaseAmountBetweenCriterion,
  PurchaseQtyBetweenByTagCriterion,
  PurchaseQtyBetweenCriterion,
} from '@wings-online/common';

import { CartItem, PackQty, Tag, Voucher } from '../domains';
import {
  FlashSalePromo,
  ItemPromoCondition,
  ItemPromoCriteria,
  PromoBenefit,
} from '../promotion';
import { CartItemReadModel } from '../read-models';

export class CartUtils {
  public static mapFlashSaleByItemId(
    flashSaleList: FlashSalePromo[],
    itemList: CartItemReadModel[],
  ): Map<string, FlashSalePromo> {
    const itemFlashSaleMap: Map<string, FlashSalePromo> = new Map();
    for (const flashSale of flashSaleList) {
      const { itemId, tag } = flashSale;
      if (itemId === '*') {
        const affectedItems = itemList.filter((x) =>
          x.item.tags.includes(tag!.toString()),
        );
        for (const affectedItem of affectedItems) {
          if (!itemFlashSaleMap.get(affectedItem.item.id)) {
            itemFlashSaleMap.set(affectedItem.item.id, flashSale);
          }
        }
      } else {
        const item = itemList.find((x) =>
          itemId.equals(EntityId.fromString(x.item.id)),
        );
        if (item && !itemFlashSaleMap.get(itemId.value)) {
          itemFlashSaleMap.set(itemId.value, flashSale);
        }
      }
    }

    return itemFlashSaleMap;
  }

  public static calculateVoucherDiscount(
    voucher: Voucher,
    purchase: Money = Money.zero(),
  ): Money {
    const discount = voucher.discount.calculate(purchase);
    return voucher.maxDiscount && discount.gt(voucher.maxDiscount)
      ? voucher.maxDiscount
      : discount;
  }

  public static splitQtyPerUom(
    qty: number,
    item: {
      baseQty: number;
      packQty: number;
    },
  ): {
    baseQty: number;
    packQty: number;
  } {
    const packQty = Math.floor(qty / item.packQty);
    const baseQty = (qty - packQty * item.packQty) / item.baseQty;

    return {
      baseQty,
      packQty,
    };
  }

  public static filterCartItemByTag(
    cartItems: CartItem[],
    tag: Tag,
  ): CartItem[] {
    return cartItems.filter((cartItem) => {
      return (
        cartItem.qty.value !== 0 && cartItem.tags.some((t) => t.equals(tag))
      );
    });
  }

  public static checkAgainstCriteria(
    criteria: ItemPromoCriteria,
    cartItem: CartItemReadModel,
  ): boolean {
    const { criterion } = criteria;
    if (
      criterion instanceof MinimumPurchaseQtyCriterion ||
      criterion instanceof PurchaseQtyBetweenCriterion
    ) {
      return criterion.isCriterionMet(
        cartItem.purchaseQtyOfUomType(criterion.uomType),
      );
    } else if (
      criterion instanceof MinimumPurchaseQtyByTagCriterion ||
      criterion instanceof PurchaseQtyBetweenByTagCriterion
    ) {
      return criterion.isCriterionMet({
        tagPurchase: Object.keys(cartItem.cartQty.qtyByTags).map((tag) => ({
          tag: Tag.fromString(tag),
          ...cartItem.cartQty.byTag(Tag.fromString(tag)),
        })),
        itemPurchase: cartItem.cartQty.qtyByItems,
        uomConversion: {
          base: PackQty.create(cartItem.item.baseQty),
          pack: PackQty.create(cartItem.item.packQty),
        },
      });
    } else if (
      criterion instanceof MinimumPurchaseAmountCriterion ||
      criterion instanceof PurchaseAmountBetweenCriterion
    ) {
      return criterion.isCriterionMet(cartItem.subtotal);
    } else {
      return false;
    }
  }

  public static getBenefitFromCondition(
    condition: ItemPromoCondition,
    cartItem: CartItemReadModel,
  ): PromoBenefit | undefined {
    let benefit: PromoBenefit | undefined;
    if (condition.type === 'AllOf') {
      if (
        condition.criteria.every((criteria) =>
          this.checkAgainstCriteria(criteria, cartItem),
        )
      ) {
        benefit = condition.benefit;
      }
    } else {
      const criteriaMet = condition.criteria.find((criteria) =>
        this.checkAgainstCriteria(criteria, cartItem),
      );
      benefit = criteriaMet?.benefit;
    }
    return benefit;
  }
}
