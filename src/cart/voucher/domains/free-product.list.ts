import { WatchedList } from '@wings-corporation/domain';

import { FreeProductReadModel } from '../read-models';

export class FreeProductReadModelList extends WatchedList<FreeProductReadModel> {
  compareItems(a: FreeProductReadModel, b: FreeProductReadModel): boolean {
    return a.id === b.id;
  }

  merge(item: FreeProductReadModel | FreeProductReadModel[]): void {
    const currentItems = this.getItems();
    const items = item instanceof Array ? item : [item];

    for (const item of items) {
      const currentItem = currentItems.find((currentItem) =>
        this.compareItems(currentItem, item),
      );
      if (currentItem) {
        currentItem.addQty(item.qty);

        if (item.appliedVoucher) currentItem.applyVoucher();
      } else {
        this.add(item);
      }
    }
  }

  clear(): void {
    this.currentItems.map((item) => this.remove(item));
  }
}
