import { Entity, EntityId, Money, Quantity } from '@wings-corporation/domain';

import { MonetaryBenefit } from './monetary-benefit.vo';
import {
  MinimumPurchaseByItemCriterion,
  MinimumPurchaseByTagCriterion,
} from './promo-criteria.vo';
import { Tag } from './tag.vo';

type ItemVoucherTarget = EntityId<string> | Tag;

type ItemVoucherCriteria =
  | MinimumPurchaseByItemCriterion
  | MinimumPurchaseByTagCriterion;

export type ItemVoucherProps = {
  criteria: ItemVoucherCriteria;
  discount: MonetaryBenefit;
  maxDiscount?: Money;
  appliedAt?: Date;
};

export class ItemVoucher extends Entity<ItemVoucherProps, string> {
  private constructor(props: ItemVoucherProps, id?: string) {
    super(props, id ? EntityId.fromString(id) : undefined);
  }

  public static create(props: ItemVoucherProps, id?: string) {
    return new ItemVoucher(props, id);
  }

  get isGeneral(): boolean {
    return false;
  }

  get target(): ItemVoucherTarget {
    return this._props.criteria.target;
  }

  get minPurchaseQty(): Quantity {
    return this._props.criteria.minQty;
  }

  get minPurchaseAmount(): Money {
    return this._props.criteria.minAmount;
  }

  get maxDiscount(): Money | undefined {
    return this._props.maxDiscount;
  }

  get discount(): MonetaryBenefit {
    return this._props.discount;
  }

  get appliedAt(): Date | undefined {
    return this._props.appliedAt;
  }

  check(
    item: ItemVoucherTarget,
    purchaseQty: Quantity,
    purchaseAmount: Money,
  ): boolean {
    const { criteria } = this.props;
    if (
      item instanceof Tag &&
      criteria instanceof MinimumPurchaseByTagCriterion
    ) {
      return criteria.check({
        tag: item,
        amount: purchaseAmount,
        qty: purchaseQty,
      });
    } else if (
      item instanceof EntityId &&
      criteria instanceof MinimumPurchaseByItemCriterion
    ) {
      return criteria.check({
        itemId: item,
        amount: purchaseAmount,
        qty: purchaseQty,
      });
    }

    return false;
  }

  setAppliedAt(date: Date) {
    this._props.appliedAt = date;
  }
}
