import { WatchedList } from '@wings-corporation/domain';

import { ItemVoucher } from './item-voucher.entity';

export class CheckoutItemVoucherList extends WatchedList<ItemVoucher> {
  compareItems(a: ItemVoucher, b: ItemVoucher): boolean {
    return a.id.equals(b.id);
  }
}
