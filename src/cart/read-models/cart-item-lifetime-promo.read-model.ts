import { Nullable } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import {
  DiscountBenefit,
  MinimumPurchaseQtyCriterion,
  MonetaryBenefitType,
  PromoUtil,
} from '@wings-online/common';

import { TprPromo } from '../promotion';
import { CartUtils } from '../utils/cart.utils';
import { CartItemReadModel } from './cart-item.read-model';

export type JsonCartItemLifetimePromoProps = {
  id: string;
  is_applied: boolean;
  min_qty: number;
  min_qty_uom_type: UomType;
  discount: {
    type: MonetaryBenefitType;
    value: number;
    uom_type: Nullable<UomType>;
  };
};

export class CartItemLifetimePromoReadModel {
  constructor(
    private _cartItem: CartItemReadModel,
    private _promo?: TprPromo,
  ) {}

  applyPromotion(promo: TprPromo) {
    this._promo = promo;
  }

  get criteria(): MinimumPurchaseQtyCriterion | undefined {
    if (this._promo?.condition.type === 'OneOf') {
      return this._promo.condition.criteria[0]
        .criterion as MinimumPurchaseQtyCriterion;
    } else {
      return this._promo?.condition.criteria[0]
        .criterion as MinimumPurchaseQtyCriterion;
    }
  }

  get discountBenefit(): DiscountBenefit | undefined {
    if (this._promo?.condition.type === 'OneOf') {
      return this._promo.condition.criteria[0].benefit.discount;
    } else {
      return this._promo?.condition.benefit.discount;
    }
  }

  get isApplied() {
    return this._promo
      ? !!CartUtils.getBenefitFromCondition(
          this._promo.condition,
          this._cartItem,
        )
      : false;
  }

  get discountAmount(): Money {
    const discountBenefit = this.discountBenefit;
    if (!discountBenefit) {
      return Money.zero();
    }

    let discount = PromoUtil.resolveMonetaryBenefit(
      discountBenefit,
      this._cartItem.price,
      {
        baseQty: Quantity.create(this._cartItem.item.baseQty),
        packQty: Quantity.create(this._cartItem.item.packQty),
      },
    );

    if (discount.gt(this._cartItem.price)) {
      discount = this._cartItem.price;
    }

    return discount;
  }

  toJSON(): JsonCartItemLifetimePromoProps | undefined {
    const criteria = this.criteria;
    const discountBenefit = this.discountBenefit;

    if (!this._promo || !criteria || !discountBenefit) {
      return;
    }

    return {
      id: this._promo.id.value,
      is_applied: this.isApplied,
      min_qty: criteria.qty.value,
      min_qty_uom_type: criteria.uomType,
      discount: {
        type: discountBenefit.type,
        value: discountBenefit.value.value,
        uom_type: discountBenefit.scaleUomType || null,
      },
    };
  }
}
