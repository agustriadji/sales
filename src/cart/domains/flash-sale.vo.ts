import { Quantity, ValueObject } from '@wings-corporation/domain';
import {
  ItemPurchase,
  ItemTagPurchase,
} from '@wings-online/cart/interfaces/promotion.interface';

import { PromoBenefit } from './promo-benefit.vo';
import { PromotionConditionExactlyOne } from './promo-condition-exactly-one.vo';
import {
  MinimumItemPurchaseCriterion,
  MinimumItemTagPurchaseCriterion,
} from './promo-criteria.vo';

type ItemRedemption = {
  orderNumber: string;
  qty: Quantity;
};

export type FlashSaleProps = {
  externalId: string;
  criteriaId: string;
  condition: PromotionConditionExactlyOne<
    MinimumItemPurchaseCriterion | MinimumItemTagPurchaseCriterion
  >;
  redemptions: ItemRedemption[];
};

export class FlashSale extends ValueObject<FlashSaleProps> {
  private constructor(props: FlashSaleProps) {
    super(props);
  }

  public static create(props: FlashSaleProps): FlashSale {
    return new FlashSale(props);
  }

  get externalId() {
    return this._value.externalId;
  }

  get criteriaId() {
    return this._value.criteriaId;
  }

  get minQty() {
    return this._value.condition.criteria.minQty;
  }

  get maxQty() {
    return this._value.condition.benefitInfo.maxQty!.subtract(this.usedQuota);
  }

  get usedQuota(): Quantity {
    return this._value.redemptions.reduce((acc, curr) => {
      return acc.add(curr.qty);
    }, Quantity.zero());
  }

  get itemId() {
    if (
      this._value.condition.criteria instanceof MinimumItemPurchaseCriterion
    ) {
      return this._value.condition.criteria.itemId;
    }
  }

  get tag() {
    if (
      this._value.condition.criteria instanceof MinimumItemTagPurchaseCriterion
    ) {
      return this._value.condition.criteria.tag;
    }
  }

  benefitOf(
    itemPurchase: ItemPurchase,
    itemTagPurchase?: ItemTagPurchase,
  ): PromoBenefit | undefined {
    return this._value.condition.benefitOf({
      items: {
        [itemPurchase.itemId.value]: itemPurchase,
      },
      tags: itemTagPurchase
        ? {
            [itemTagPurchase.tag.toString()]: itemTagPurchase,
          }
        : {},
    });
  }
}
