import { WatchedList } from '@wings-corporation/domain';

import { CartItem } from './cart-item.entity';

export class CartItemList extends WatchedList<CartItem> {
  compareItems(a: CartItem, b: CartItem): boolean {
    return a.itemId.equals(b.itemId);
  }

  clear(): void {
    this.currentItems.map((item) => this.remove(item));
  }
}
