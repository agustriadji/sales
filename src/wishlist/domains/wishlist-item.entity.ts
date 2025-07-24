import { Entity, EntityId } from '@wings-corporation/domain';

export type WishlistItemProps = {
  wishlistId: EntityId<string>;
  itemId: EntityId<string>;
};

export class WishlistItem extends Entity<WishlistItemProps, string> {
  private constructor(props: WishlistItemProps) {
    super(props);
  }

  public static create(props: WishlistItemProps) {
    return new WishlistItem(props);
  }

  get wishlistId(): EntityId<string> {
    return this._props.wishlistId;
  }

  get itemId(): EntityId<string> {
    return this.props.itemId;
  }
}
