import { Collection } from '@wings-corporation/core';
import { VoucherReadModel } from '@wings-online/cart/voucher/read-models';

export class ListVouchersResult {
  readonly data: Collection<VoucherReadModel>;

  constructor(props: Collection<VoucherReadModel>) {
    this.data = props;
  }
}
