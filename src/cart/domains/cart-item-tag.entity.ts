import { Entity, EntityId, Quantity } from '@wings-corporation/domain';

import { Tag } from './tag.vo';

export type CartItemTagProps = {
  tag: Tag;
  totalQty: Quantity;
};

export class CartItemTag extends Entity<CartItemTagProps, string> {
  private constructor(props: CartItemTagProps, id?: string) {
    super(props, id ? EntityId.fromString(id) : undefined);
  }

  public static create(props: CartItemTagProps, id?: string) {
    return new CartItemTag(props, id);
  }

  get tag(): Tag {
    return this._props.tag;
  }

  get totalQty(): Quantity {
    return this._props.totalQty;
  }

  updateTotalQty(totalQty: Quantity) {
    if (!totalQty.equals(this._props.totalQty)) {
      this._props.totalQty = totalQty;
      this.markDirty();
    }
  }
}
