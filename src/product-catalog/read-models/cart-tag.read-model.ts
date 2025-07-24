import { Quantity } from '@wings-corporation/domain';
import { Tag } from '@wings-online/cart/domains';

export type CartTagReadModel = {
  tag: Tag;
  qty: Quantity;
  qtyIntermediate: Quantity;
  qtyPack: Quantity;
  items: Array<{
    itemId: string;
    qty: Quantity;
    addedAt: Date;
  }>;
};
