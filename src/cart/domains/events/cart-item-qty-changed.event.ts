import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type CartItemQtyChangedEventData = {
  identity: UserIdentity;
  cartItemId: string;
  cartId: string;
  itemId: string;
  qty: number;
};

export class CartItemQtyChanged extends DomainEvent<CartItemQtyChangedEventData> {
  readonly name = 'CartItemQtyChanged';
  readonly version = 1;

  constructor(data: CartItemQtyChangedEventData) {
    super(data);
  }
}
