import { AggregateRoot, EntityId } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

import {
  WishlistItemAdded,
  WishlistItemRemoved,
  WishlistRenamed,
} from './events';
import { WishlistItem, WishlistItemProps } from './wishlist-item.entity';
import { WishlistItemList } from './wishlist-item.list';

type WishlistRequiredProps = {
  buyerId: string;
  name: string;
};

type WishlistOptionalProps = Partial<{
  items: WishlistItemList;
  isDefault: boolean;
}>;

export type WishlistProps = WishlistRequiredProps & WishlistOptionalProps;

export class Wishlist extends AggregateRoot<Required<WishlistProps>, string> {
  private constructor(props: WishlistProps, id?: string) {
    super(
      {
        ...props,
        items: props.items || new WishlistItemList(),
        isDefault: props.isDefault || false,
      },
      id ? EntityId.fromString(id) : undefined,
    );
  }

  public static create(props: WishlistProps, id?: string) {
    return new Wishlist(props, id);
  }

  get buyerId(): string {
    return this._props.buyerId;
  }

  get name(): string {
    return this._props.name;
  }

  get items() {
    return this.props.items;
  }

  get isDefault(): boolean {
    return this._props.isDefault;
  }

  public rename(name: string, identity: UserIdentity) {
    this.props.name = name;
    this.raise(
      new WishlistRenamed({
        wishlistId: this.id.value,
        identity,
      }),
    );
    this.markDirty();
  }

  public addItem(item: WishlistItemProps, identity: UserIdentity) {
    const existing = this.findItem(item.itemId.value);

    if (!existing) {
      const wishlistItem = WishlistItem.create(item);
      this.props.items.add(wishlistItem);
      this.markDirty();

      this.raise(
        new WishlistItemAdded({
          identity,
          wishlistId: this.id.value,
          wishlistItemId: wishlistItem.id.value,
          itemId: wishlistItem.itemId.value,
        }),
      );
    }
  }

  public removeItem(itemId: string, identity: UserIdentity): void {
    const existing = this.findItem(itemId);
    if (existing) {
      this.props.items.remove(existing);
      this.markDirty();

      this.raise(
        new WishlistItemRemoved({
          identity,
          wishlistId: this.id.value,
          wishlistItemId: existing.id.value,
          itemId: existing.itemId.value,
        }),
      );
    }
  }

  private findItem(itemId: string): WishlistItem | undefined {
    return this.props.items.currentItems.find((item) =>
      item.itemId.equals(EntityId.fromString(itemId)),
    );
  }
}
