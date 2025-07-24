import { Nullable } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';

import { MonetaryBenefitType } from '../promotion';
import { ProductPromotionReadModelUtil } from '../utils';
import { ProductReadModel } from './product.read-model';
import {
  isDirectPromotion,
  LifetimePromotionReadModel,
  PromotionReadModel,
} from './promotion.read-model';

type PriceInfo = {
  listed: number;
  offered: number;
  discounted: number;
};

export type JsonProductLifetimePromotionReadModelProps = {
  id: string;
  external_id?: string;
  is_applied: boolean;
  condition: {
    min_qty: number;
    min_qty_uom_type: UomType;
    discount: {
      type: MonetaryBenefitType;
      value: number;
      uom_type: Nullable<UomType>;
    };
  };
  price?: {
    base: PriceInfo;
    pack: Nullable<PriceInfo>;
  };
};

export class ProductLifetimePromotionReadModel {
  private _promotion: LifetimePromotionReadModel;
  private _product: ProductReadModel;

  constructor(
    product: ProductReadModel,
    promotion: LifetimePromotionReadModel,
  ) {
    this._product = product;
    this._promotion = promotion;
  }

  get promotion(): PromotionReadModel {
    return this._promotion;
  }

  get discountAmount(): Money {
    return ProductPromotionReadModelUtil.calculatePromotionDiscount(
      this._promotion,
      this._product.price,
      this._product,
    );
  }

  get qty(): Quantity {
    return this._product.cartQty;
  }

  toJSON(): JsonProductLifetimePromotionReadModelProps | undefined {
    const promotion = this._promotion;

    const discountBenefit = isDirectPromotion(promotion)
      ? promotion.benefit.discount[0]
      : promotion.conditions[0]?.benefit.discount[0];

    if (!discountBenefit) {
      return;
    }

    const discount = this.discountAmount;

    const price = this._product.price;
    const basePrice = price.multiply(this._product.baseQty);
    const packPrice = price.multiply(this._product.packQty);

    const baseDiscount = discount.multiply(this._product.baseQty);
    const packDiscount = discount.multiply(this._product.packQty);

    return {
      id: isDirectPromotion(promotion)
        ? promotion.condition.promotionIds[0]
        : promotion.conditions[0]?.promotionIds[0],
      external_id: promotion.externalId,
      is_applied: ProductPromotionReadModelUtil.isPromotionApplied(
        promotion,
        this._product,
        this.qty,
      ),
      condition: {
        min_qty: isDirectPromotion(promotion)
          ? 1
          : promotion.conditions[0].minQty,
        min_qty_uom_type: isDirectPromotion(promotion)
          ? this._product.baseUomType
          : promotion.conditions[0].minQtyUomType,
        discount: {
          type: discountBenefit.type,
          value: discountBenefit.value,
          uom_type:
            discountBenefit.type === 'PERCENTAGE'
              ? null
              : discountBenefit.scaleUomType,
        },
      },
      price: {
        base: {
          listed: basePrice.value,
          offered: Math.ceil(basePrice.value - baseDiscount.value),
          discounted: baseDiscount.value,
        },
        pack: this._product.hasPackUom
          ? {
              listed: packPrice.value,
              offered: Math.ceil(packPrice.value - packDiscount.value),
              discounted: packDiscount.value,
            }
          : null,
      },
    };
  }
}
