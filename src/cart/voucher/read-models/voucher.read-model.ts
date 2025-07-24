import { Nullable } from '@wings-corporation/core';
import { DiscountType } from '@wings-online/app.constants';
import { ReadModel } from '@wings-online/common';

export interface JsonVoucherReadModelProps {
  external_id: string;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase: number;
  max_discount: Nullable<number>;
  non_combinable_vouchers: string[];
  total_purchase: number;

  item_id?: string;
  item_name?: string;
  grp_02?: string;
  brand_name?: string;
  is_item_in_cart?: boolean;
}

export interface VoucherReadModelProps {
  externalId: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchase: number;
  maxDiscount: Nullable<number>;
  nonCombinableVouchers: string[];
  totalPurchase?: number;

  itemId?: string;
  itemName?: string;
  grp02?: string;
  brandName?: string;
  isItemInCart?: boolean;
}

export class VoucherReadModel extends ReadModel {
  constructor(public props: VoucherReadModelProps) {
    super();
  }

  get externalId(): string {
    return this.props.externalId;
  }

  get itemId(): string | undefined {
    return this.props.itemId;
  }

  get grp02(): string | undefined {
    return this.props.grp02;
  }

  get discountType(): DiscountType {
    return this.props.discountType;
  }

  get discountValue(): number {
    return this.props.discountValue;
  }

  get minPurchase(): number {
    return this.props.minPurchase;
  }

  get maxDiscount(): Nullable<number> {
    return this.props.maxDiscount;
  }

  get nonCombinableVouchers(): string[] {
    return this.props.nonCombinableVouchers;
  }

  addNonCombinableVoucher(voucherIds: string[]): void {
    voucherIds.forEach(
      (id) =>
        !this.props.nonCombinableVouchers.includes(id) &&
        this.props.nonCombinableVouchers.push(id),
    );
  }

  updateTotalPurchase(totalPurchase: number): void {
    this.props.totalPurchase = totalPurchase;
  }

  updateIsItemInCart(isItemInCart: boolean): void {
    this.props.isItemInCart = isItemInCart;
  }

  toJSON(): JsonVoucherReadModelProps {
    return {
      external_id: this.props.externalId,
      item_id: this.props.itemId,
      item_name: this.props.itemName,
      grp_02: this.props.grp02,
      brand_name: this.props.brandName,
      is_item_in_cart: this.props.isItemInCart,
      discount_type: this.props.discountType,
      discount_value: this.props.discountValue,
      min_purchase: this.props.minPurchase,
      max_discount: this.props.maxDiscount,
      non_combinable_vouchers: this.props.nonCombinableVouchers,
      total_purchase: this.props.totalPurchase || 0,
    };
  }
}
