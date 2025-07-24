import { Entity, EntityId, Money } from '@wings-corporation/domain';

import { ItemVoucher } from './item-voucher.entity';
import { MonetaryBenefit } from './monetary-benefit.vo';

export type Voucher = GeneralVoucher | ItemVoucher;

type GeneralVoucherProps = {
  minPurchase: Money;
  maxDiscount?: Money;
  discount: MonetaryBenefit;
  appliedAt?: Date;
};

export class GeneralVoucher extends Entity<GeneralVoucherProps, string> {
  private constructor(props: GeneralVoucherProps, id?: string) {
    super(props, id ? EntityId.fromString(id) : undefined);
  }

  public static create(props: GeneralVoucherProps, id?: string) {
    return new GeneralVoucher(props, id);
  }

  get isGeneral(): boolean {
    return true;
  }

  get minPurchase(): Money {
    return this._props.minPurchase;
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

  setAppliedAt(date: Date) {
    this._props.appliedAt = date;
  }
}
