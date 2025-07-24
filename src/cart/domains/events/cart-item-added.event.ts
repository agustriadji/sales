import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type CartItemAddedEventData = {
  identity: UserIdentity;
  cartItemId: string;
  cartId: string;
  itemId: string;
  qty: number;
};

export class CartItemAdded extends DomainEvent<CartItemAddedEventData> {
  readonly name = 'CartItemAdded';
  readonly version = 1;

  constructor(data: CartItemAddedEventData) {
    super(data);
  }
}
