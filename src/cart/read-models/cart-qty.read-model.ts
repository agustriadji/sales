import { Quantity } from '@wings-corporation/domain';

import { Tag } from '../domains';

export type TagCartQuantity = {
  qty: Quantity;
  items: CartItemQuantity[];
};

export type CartQuantity = {
  qty: Quantity;
  qtyIntermediate: Quantity;
  qtyPack: Quantity;
  addedAt: Date;
};

type CartItemQuantity = { itemId: string } & CartQuantity;
type CartTagQuantity = { tag: Tag } & TagCartQuantity;

export class CartQtyReadModel {
  private _qtyByTags: Record<string, TagCartQuantity> = {};
  private _qtyByItems: Record<string, CartQuantity> = {};

  addQtyByItem(cartItem: CartItemQuantity): void {
    this._qtyByItems[cartItem.itemId] = {
      qty: cartItem.qty,
      qtyIntermediate: cartItem.qtyIntermediate,
      qtyPack: cartItem.qtyPack,
      addedAt: cartItem.addedAt,
    };
  }

  byItem(itemId: string): CartQuantity {
    const found = this._qtyByItems[itemId];
    return found || this.zeroCartQuantity();
  }

  addQtyByTag(cartTag: CartTagQuantity): void {
    this._qtyByTags[cartTag.tag.toString()] = {
      qty: cartTag.qty,
      items: cartTag.items,
    };
  }

  byTag(tag: Tag): TagCartQuantity {
    const found = this._qtyByTags[tag.toString()];
    return found || this.zeroTagCartQuantity();
  }

  get qtyByItems(): Record<string, CartQuantity> {
    return this._qtyByItems;
  }

  get qtyByTags(): Record<string, TagCartQuantity> {
    return this._qtyByTags;
  }

  private zeroCartQuantity(): CartQuantity {
    return {
      qty: Quantity.zero(),
      qtyIntermediate: Quantity.zero(),
      qtyPack: Quantity.zero(),
      addedAt: new Date(),
    };
  }

  private zeroTagCartQuantity(): TagCartQuantity {
    return {
      qty: Quantity.zero(),
      items: [],
    };
  }
}
