import { CartItemPrice } from '.';

import { Nullable } from '@wings-corporation/core';
import { Money, Percentage, Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { FlashSalePromo } from '@wings-online/cart/promotion';
import { BenefitType, PromoUtil, ReadModel } from '@wings-online/common';
import { CartItemQuantity } from '@wings-online/product-catalog/read-models/qty-in-cart.read-model';

import {
  CartItemReadModel,
  JsonPromoCriteriaProps,
} from './cart-item.read-model';

type Benefit = {
  type: BenefitType;
  value: number;
  uom_type: UomType;
};

type PromotionBenefit = {
  discount: Nullable<Benefit>;
  coin: Nullable<
    Benefit & {
      coin_amount: number;
    }
  >;
};

export type JsonFlashSaleCartItemProps = {
  external_id: string;
  base_qty: number;
  pack_qty: number;
  total_qty: number;
  min_qty: number;
  max_qty: number;
  benefit: PromotionBenefit;
  price: CartItemPrice;
  coin: number;
  start_at: Nullable<Date>;
  end_at: Nullable<Date>;
  min_qty_uom_type: UomType;
  max_qty_uom_type: UomType;
  scale_qty_uom_type: UomType;
  is_applied: boolean;
  tag: Nullable<{
    name: string;
    max_qty: number;
    previous_qty: number;
    total_qty: number;
  }>;
};

export class FlashSaleCartItemReadModel extends ReadModel {
  private promotion?: FlashSalePromo;

  constructor(private readonly parent: CartItemReadModel) {
    super();
  }

  get id(): string {
    return this.promotion?.id.value || '';
  }

  get code(): string | null {
    return this.promotion?.code || null;
  }

  get minQty(): Quantity {
    return this.promotion
      ? this.promotion.condition.criteria[0].criterion.qty
      : Quantity.zero();
  }

  get tagItems(): CartItemQuantity[] {
    if (!this.promotion) return [];
    if (!this.promotion.tag) return [];
    return this.parent.cartQty
      .byTag(this.promotion.tag)
      .items.sort((x, y) => x.addedAt.getTime() - y.addedAt.getTime());
  }

  get remainingQty(): Quantity | undefined {
    if (!this.promotion) return;
    if (!this.promotion.tag) return;

    let remainingQty = this.promotion.condition.maxQty;
    let currentItemQty = Quantity.zero();
    for (const item of this.tagItems) {
      const usedQuota = item.qty.gte(remainingQty) ? remainingQty : item.qty;
      if (item.itemId === this.parent.item.id) {
        currentItemQty = usedQuota;
      }
      remainingQty = remainingQty.subtract(usedQuota);
    }

    return currentItemQty.add(remainingQty);
  }

  get maxQty(): Quantity {
    if (this.promotion) {
      const maxQty = this.promotion.condition.maxQty.subtract(
        this.promotion.redeemedQty,
      );
      // override maxQty
      const remainingQty = this.remainingQty;
      return remainingQty && remainingQty.lt(maxQty) ? remainingQty : maxQty;
    }
    return Quantity.zero();
  }

  get qty(): Quantity {
    if (!this.promotion) return Quantity.zero();
    const qty = this.promotion.tag
      ? this.tagItems.reduce<Quantity>(
          (acc, item) => acc.add(item.qty),
          Quantity.zero(),
        )
      : this.parent.qty;
    if (qty.lt(this.minQty)) return Quantity.zero();
    if (this.parent.qty.gte(this.maxQty)) return this.maxQty;
    return this.parent.qty;
  }

  // ignore min qty to calculate offered price
  get flashSaleQty(): Quantity {
    if (!this.promotion) {
      return Quantity.zero();
    }
    return this.parent.qty.gte(this.maxQty) ? this.maxQty : this.parent.qty;
  }

  get priceBeforeDiscount(): Money {
    return this.parent.price.subtract(this.parent.lifetimePromo.discountAmount);
  }

  get discount(): Money {
    if (this.promotion) {
      const { benefit } = this.promotion.condition;
      if (benefit && benefit.discount) {
        return PromoUtil.resolveMonetaryBenefit(
          benefit.discount,
          this.priceBeforeDiscount,
          {
            baseQty: Quantity.create(this.parent.item.baseQty),
            packQty: Quantity.create(this.parent.item.packQty),
          },
        ).add(this.parent.lifetimePromo.discountAmount);
      }
    }
    return Money.zero();
  }

  get discountPercentage(): Percentage {
    if (this.promotion) {
      const { benefit } = this.promotion.condition;
      if (benefit && benefit.discount) {
        return benefit.discount.type === 'PERCENTAGE'
          ? benefit.discount.value
          : Percentage.create(
              (this.discount.value / this.priceBeforeDiscount.value) * 100,
            );
      }
    }
    return Percentage.zero();
  }

  get price(): Money {
    return this.priceBeforeDiscount.subtract(this.discount);
  }

  get totalDiscount(): Money {
    return this.priceBeforeDiscount.subtract(this.price).multiply(this.qty);
  }

  get subtotal(): Money {
    return Money.create(this.qty.value * this.parent.price.value);
  }

  get coin(): Money {
    if (this.promotion) {
      const { benefit } = this.promotion.condition;
      if (benefit && benefit.coin) {
        return PromoUtil.resolveMonetaryBenefit(
          benefit.coin,
          this.priceBeforeDiscount,
          {
            baseQty: Quantity.create(this.parent.item.baseQty),
            packQty: Quantity.create(this.parent.item.packQty),
          },
        );
      }
    }
    return Money.zero();
  }

  get totalCoin(): Money {
    return Money.create(this.qty.value * this.coin.value);
  }

  get criteria(): JsonPromoCriteriaProps | undefined {
    if (this.promotion) {
      const { criteria } = this.promotion.condition;
      return {
        qty: criteria[0].criterion.qty.value,
        discount: this.discount.value,
        coin: this.coin.value,
      };
    }
  }

  get baseDiscount(): Money {
    return Money.create(
      this.discount.value *
        Math.max(
          this.parent.item.baseQty,
          Math.min(this.parent.item.baseQty, this.flashSaleQty.value),
        ),
    );
  }

  get packDiscount(): Money {
    return Money.create(
      this.discount.value *
        Math.max(
          this.parent.item.packQty,
          Math.min(this.parent.item.packQty, this.flashSaleQty.value),
        ),
    );
  }

  get isApplied(): boolean {
    if (!this.promotion) return false;
    if (this.promotion.tag) {
      const totalQty = this.tagItems.reduce<Quantity>(
        (acc, item) => acc.add(item.qty),
        Quantity.zero(),
      );
      return totalQty.gte(this.minQty) && this.qty.gt(Quantity.zero());
    }
    return this.qty.gte(this.minQty);
  }

  applyPromotion(promo: FlashSalePromo): void {
    this.promotion = promo;
  }

  toJSON(): JsonFlashSaleCartItemProps {
    const totalPack = this.parent.item.hasPackUoM()
      ? Math.floor(this.qty.value / this.parent.item.packQty)
      : 0;
    const totalBase =
      (this.qty.value - totalPack * this.parent.item.packQty) /
      this.parent.item.baseQty;

    const discount = this.promotion?.condition.benefit.discount;
    const coin = this.promotion?.condition.benefit.coin;

    const minQty = this.getCriteria(
      {
        qty: Quantity.create(this.parent.item.baseQty),
        uom: this.parent.item.baseUomType,
      },
      this.minQty && this.promotion?.condition.criteria[0].minQtyUomType
        ? {
            qty: this.minQty,
            uom: this.promotion.condition.criteria[0].minQtyUomType,
          }
        : undefined,
    );

    let tagTotalQty = 0;
    let tagPreviousQty = 0;
    let tagMaxQty = 0;
    if (this.promotion?.tag) {
      const itemWithSameTags = this.tagItems;

      tagTotalQty = itemWithSameTags.reduce(
        (acc, item) => acc + item.qty.value,
        0,
      );
      for (const item of itemWithSameTags) {
        if (item.itemId === this.parent.item.id) break;
        tagPreviousQty += item.qty.value;
      }
      tagMaxQty = Math.max(
        this.promotion.condition.maxQty.value -
          this.promotion.redeemedQty.value,
        0,
      );
    }
    return {
      external_id: this.promotion?.code || '',
      base_qty: totalBase,
      pack_qty: totalPack,
      total_qty: this.qty.value,
      min_qty: minQty.qty,
      max_qty: this.maxQty.value,
      benefit: {
        discount: discount
          ? {
              type: discount.type,
              value: discount.value.value,
              uom_type:
                discount.type === 'AMOUNT'
                  ? discount.scaleUomType || UomTypeEnum.BASE
                  : UomTypeEnum.BASE,
            }
          : null,
        coin: coin
          ? {
              type: coin.type,
              value: coin.value.value,
              uom_type:
                coin.type === 'AMOUNT'
                  ? coin.scaleUomType || UomTypeEnum.BASE
                  : UomTypeEnum.BASE,
              coin_amount: this.coin.value,
            }
          : null,
      },
      price: {
        base: {
          listed: this.parent.basePrice.value,
          offered: Math.ceil(
            PromoUtil.resolveOfferedPrice(
              this.parent.basePrice,
              this.baseDiscount,
            ).value,
          ),
        },
        pack: this.parent.packPrice
          ? {
              listed: this.parent.packPrice.value,
              offered: Math.ceil(
                PromoUtil.resolveOfferedPrice(
                  this.parent.packPrice,
                  this.packDiscount,
                ).value,
              ),
            }
          : null,
      },
      coin: this.totalCoin.value,
      start_at: this.promotion?.startAt || null,
      end_at: this.promotion?.endAt || null,
      min_qty_uom_type: minQty.uomType,
      max_qty_uom_type:
        this.promotion?.condition.maxQtyUomType || UomTypeEnum.BASE,
      scale_qty_uom_type:
        this.promotion?.condition.benefit.discount?.scaleUomType ||
        UomTypeEnum.BASE,
      is_applied: this.isApplied,
      tag: this.promotion?.tag
        ? {
            name: this.promotion.tag.toString(),
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
