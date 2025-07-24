import { Quantity } from '@wings-corporation/domain';
import { Tag } from '@wings-online/cart/domains';

import { CartItemReadModel } from './cart-item.read-model';
import { CartTagReadModel } from './cart-tag.read-model';
import { ProductReadModel } from './product.read-model';

export type CartQuantity = {
  qty: Quantity;
  items: CartItemQuantity[];
};

export type CartItemQuantity = {
  itemId: string;
  qty: Quantity;
  addedAt: Date;
};

export class QtyInCartReadModel {
  private _qtyByTags: Map<string, CartQuantity> = new Map();
  private _qtyByItems: Map<string, CartQuantity> = new Map();

  constructor(private readonly product: ProductReadModel) {
    for (const tag of product.tags) {
      this._qtyByTags.set(tag.toString(), this.zeroCartQuantity());
    }
  }

  addQtyByTag(cartTag: CartTagReadModel): void {
    this._qtyByTags.set(cartTag.tag.toString(), {
      qty: cartTag.qty,
      items: cartTag.items,
    });
  }

  addQtyByItem(cartItem: CartItemReadModel): void {
    this._qtyByItems.set(cartItem.itemId, {
      qty: cartItem.qty,
      items: [],
    });
  }

  byTag(tag: Tag): CartQuantity {
    const found = this._qtyByTags.get(tag.toString());
    return found || this.zeroCartQuantity();
  }

  byItem(itemId: string): CartQuantity {
    const found = this._qtyByItems.get(itemId);
    return found || this.zeroCartQuantity();
  }

  private zeroCartQuantity(): CartQuantity {
    return {
      qty: Quantity.zero(),
      items: [],
    };
  }
}
