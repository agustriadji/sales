import { Quantity } from '@wings-corporation/domain';

export type CartItemReadModel = {
  itemId: string;
  qty: Quantity;
  addedAt: Date;
};
