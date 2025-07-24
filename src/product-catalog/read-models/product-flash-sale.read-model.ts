import { Nullable } from '@wings-corporation/core';
import { Money, Percentage, Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';
import { ReadModel } from '@wings-online/common';

import { PromoUtils } from '../utils/promo.util';
import { FlashSaleReadModel } from './flash-sale.read-model';
import { ProductReadModel } from './product.read-model';
import { CartItemQuantity } from './qty-in-cart.read-model';

export type JsonFlashSaleProps = {
  external_id: string;
  is_applied: boolean;
  start_at: Nullable<Date>;
  end_at: Nullable<Date>;
  criteria: {
    min_qty: number;
    min_qty_uom_type: UomType;
  };
  benefit: {
    discount: number;
    discount_percentage: number;
    coin: number;
    scale_qty: number;
    max_qty: number;
    max_qty_uom_type: UomType;
    scale_qty_uom_type: UomType;
  };
  price: {
    base: number;
    pack: number;
  };
  tag: Nullable<{
    name: string;
    max_qty: number;
    previous_qty: number;
    total_qty: number;
  }>;
};

export class ProductFlashSaleReadModel extends ReadModel {
  private _promotion?: FlashSaleReadModel;

  constructor(private readonly parent: ProductReadModel) {
    super();
  }

  get id(): string | undefined {
    return this.promotion?.id;
  }

  get promotion(): FlashSaleReadModel | undefined {
    return this._promotion;
  }

  get isStarted(): boolean {
    if (!this.promotion) return false;
    return this.promotion.startAt <= new Date();
  }

  get minQty(): Quantity {
    if (!this.promotion) return Quantity.zero();
    return this.promotion.criteria.criterion.qty;
  }

  get tagItems(): CartItemQuantity[] {
    if (!this.promotion) return [];
    if (this.promotion.target.type !== 'TAG') return [];
    return this.parent.qtyInCart
      .byTag(Tag.fromString(this.promotion.target.value))
      .items.sort((x, y) => x.addedAt.getTime() - y.addedAt.getTime());
  }

  get remainingQty(): Quantity | undefined {
    if (!this.promotion) return;
    if (this.promotion.target.type !== 'TAG') return;

    let remainingQty = Quantity.create(this.promotion.benefit.maxQty);
    let currentItemQty = Quantity.zero();
    for (const item of this.tagItems) {
      const usedQuota = item.qty.gte(remainingQty) ? remainingQty : item.qty;
      if (item.itemId === this.parent.id) {
        currentItemQty = usedQuota;
      }
      remainingQty = remainingQty.subtract(usedQuota);
    }

    return currentItemQty.add(remainingQty);
  }

  get maxQty(): Quantity {
    if (!this.promotion) return Quantity.zero();
    const maxQty = Quantity.create(
      this.promotion.benefit.maxQty - this.promotion.redeemedQty,
    );

    // override maxQty
    const remainingQty = this.remainingQty;
    return remainingQty && remainingQty.lt(maxQty) ? remainingQty : maxQty;
  }

  get scaleQty(): Quantity {
    if (!this.promotion) return Quantity.zero();
    return Quantity.create(this.promotion.benefit.scaleQty);
  }

  get discountedQty(): Quantity {
    if (!this.promotion) return Quantity.zero();
    const qty =
      this.promotion.target.type === 'TAG'
        ? this.tagItems.reduce<Quantity>(
            (acc, item) => acc.add(item.qty),
            Quantity.zero(),
          )
        : this.parent.cartQty;
    if (qty.lt(this.minQty)) return Quantity.zero();
    if (this.parent.cartQty.gte(this.maxQty)) return this.maxQty;
    return this.parent.cartQty;
  }

  get discountPercentage(): Percentage {
    if (!this.promotion) return Money.zero();
    const { benefit } = this.promotion;
    if (benefit.discount.type === 'PERCENTAGE') {
      return benefit.discount.value;
    }
    return Percentage.zero();
  }

  get priceBeforeDiscount(): Money {
    return this.parent.price.subtract(
      this.parent.lifetimePromotion?.discountAmount || Money.zero(),
    );
  }

  get coinAmount(): Money {
    if (!this.promotion) return Money.zero();
    const { benefit } = this.promotion;
    if (!benefit.coin) return Money.zero();
    return PromoUtils.calculateDiscount(
      this.priceBeforeDiscount,
      benefit.coin,
      this.scaleQty,
    );
  }

  get totalCoinAmount(): Money {
    return this.coinAmount.multiply(this.discountedQty);
  }

  get discountAmount(): Money {
    if (!this.promotion) return Money.zero();
    if (this.maxQty.value <= 0) return Money.zero(); // reach max quota
    const { benefit } = this.promotion;
    return PromoUtils.calculateDiscount(
      this.priceBeforeDiscount,
      benefit.discount,
      this.scaleQty,
    );
  }

  get totalDiscountAmount(): Money {
    return this.discountAmount.multiply(this.discountedQty);
  }

  get isApplied(): boolean {
    if (!this.promotion) return false;
    if (this.promotion.target.type === 'TAG') {
      const totalQty = this.tagItems.reduce<Quantity>(
        (acc, item) => acc.add(item.qty),
        Quantity.zero(),
      );
      return (
        totalQty.gte(this.minQty) && this.parent.cartQty.gt(Quantity.zero())
      );
    }
    return this.parent.cartQty.gte(this.minQty);
  }

  get price(): Money {
    return this.priceBeforeDiscount.subtract(this.discountAmount);
  }

  applyPromotion(promo: FlashSaleReadModel): void {
    this._promotion = promo;
  }

  toJSON(): JsonFlashSaleProps {
    const criteria = this.getCriteria(
      {
        qty: this.parent.baseQty,
        uom: this.parent.baseUomType,
      },
      this.minQty && this.promotion?.criteria.minQtyUomType
        ? {
            qty: this.minQty,
            uom: this.promotion.criteria.minQtyUomType,
          }
        : undefined,
    );

    let tagTotalQty = 0;
    let tagPreviousQty = 0;
    let tagMaxQty = 0;
    if (this.promotion?.target.type === 'TAG') {
      const itemWithSameTags = this.tagItems;

      tagTotalQty = itemWithSameTags.reduce(
        (acc, item) => acc + item.qty.value,
        0,
      );
      for (const item of itemWithSameTags) {
        if (item.itemId === this.parent.id) break;
        tagPreviousQty += item.qty.value;
      }
      tagMaxQty = Math.max(
        this.promotion.benefit.maxQty - this.promotion.redeemedQty,
        0,
      );
    }

    return {
      external_id: this._promotion?.externalId || '',
      is_applied: this.isApplied,
      start_at: this.promotion?.startAt || null,
      end_at: this.promotion?.endAt || null,
      criteria: {
        min_qty: criteria.qty,
        min_qty_uom_type: criteria.uomType,
      },
      benefit: {
        discount: this.discountAmount.value,
        discount_percentage: this.discountPercentage.value,
        scale_qty: this.scaleQty.value,
        coin: this.coinAmount.value,
        max_qty: this.maxQty.value,
        max_qty_uom_type:
          this.promotion?.benefit.maxQtyUomType || UomTypeEnum.BASE,
        scale_qty_uom_type:
          this.promotion?.benefit.scaleQtyUomType || UomTypeEnum.BASE,
      },
      price: {
        base: Math.ceil(this.price.value * this.parent.baseQty.value),
        pack: Math.ceil(this.price.value * this.parent.packQty.value),
      },
      tag:
        this.promotion?.target.type === 'TAG'
          ? {
              name: this.promotion.target.value,
              max_qty: tagMaxQty,
              previous_qty: tagPreviousQty,
              total_qty: tagTotalQty,
            }
          : null,
    };
  }

  private getCriteria(
    base: {
      qty: Quantity;
      uom: UomType;
    },
    min?: {
      qty: Quantity;
      uom: UomType;
    },
  ): {
    qty: number;
    uomType: UomType;
  } {
    if (!min) {
      return {
        qty: 1,
        uomType: UomTypeEnum.BASE,
      };
    }
    // handle criteria when there is already flash sale redemptions
    if (min.uom === UomTypeEnum.BASE && base.uom != UomTypeEnum.BASE) {
      return {
        qty: base.qty.value,
        uomType: base.uom,
      };
    }
    return {
      qty: min.qty.value,
      uomType: min.uom,
    };
  }
}
