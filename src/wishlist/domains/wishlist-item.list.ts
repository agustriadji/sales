import { WatchedList } from '@wings-corporation/domain';

import { WishlistItem } from './wishlist-item.entity';

export class WishlistItemList extends WatchedList<WishlistItem> {
  compareItems(a: WishlistItem, b: WishlistItem): boolean {
    return a.itemId.equals(b.itemId);
  }

  clear(): void {
    this.currentItems.map((item) => this.remove(item));
  }
}
