import { Entity, EntityId, Quantity } from '@wings-corporation/domain';

import { Tag } from './tag.vo';

export type CartTagProps = {
  tag: Tag;
  qty: Quantity;
  items: Array<{
    itemId: string;
    qty: Quantity;
    addedAt: Date;
  }>;
};

export type CartTagCreateProps = {
  tag: string;
  qty?: number;
  items?: Array<{
    itemId: string;
    qty: Quantity;
    addedAt: Date;
  }>;
};

export class CartTag extends Entity<CartTagProps, string> {
  private constructor(props: CartTagCreateProps, id?: string) {
    super(
      {
        tag: Tag.fromString(props.tag),
        qty: Quantity.create(props.qty || 0),
        items: props.items || [],
      },
      id ? EntityId.fromString(id) : undefined,
    );
  }

  get tag() {
    return this._props.tag;
  }

  get qty() {
    return this._props.qty;
  }

  get items() {
    return this._props.items;
  }

  public static create(props: CartTagCreateProps, id?: string): CartTag {
    return new CartTag(props, id);
  }

  public addQty(qty: number) {
    this.updateQty(this.qty.add(Quantity.create(qty)).value);
  }

  public updateQty(qty: number) {
    const newQty = Quantity.create(qty);

    if (!this.props.qty.equals(newQty)) {
      this.props.qty = newQty;
      this.markDirty();
    }
  }
}
