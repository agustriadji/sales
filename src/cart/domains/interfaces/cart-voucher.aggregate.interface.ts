import { Nullable } from '@wings-corporation/core';
import { IAggregateRoot, WatchedProps } from '@wings-corporation/domain';

import { CheckoutItemVoucherList } from '../checkout-item-voucher.list';
import { GeneralVoucher, Voucher } from '../voucher.entity';

export interface ICartVoucherAggregate
  extends IAggregateRoot<
    {
      generalVoucher: WatchedProps<Nullable<GeneralVoucher>>;
      itemVouchers: CheckoutItemVoucherList;
    },
    string
  > {
  applyVoucher(voucher: Voucher, withValidation?: boolean): void;
  unapplyVoucher(voucherId: string): void;
  validateVouchersMaxDiscount(): void;
}
