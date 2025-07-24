import { WatchedList } from '@wings-corporation/domain';

import { CartTag } from './cart-tag.entity';

export class CartTagList extends WatchedList<CartTag> {
  compareItems(a: CartTag, b: CartTag): boolean {
    return a.tag.equals(b.tag);
  }

  reset() {
    this.currentItems.map((item) => item.updateQty(0));
  }

  clear() {
    this.currentItems.map((item) => this.remove(item));
  }
}
