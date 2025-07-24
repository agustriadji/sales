import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type CartItemRemovedEventData = {
  identity: UserIdentity;
  cartId: string;
  cartItemId: string;
  itemId: string;
};

export class CartItemRemoved extends DomainEvent<CartItemRemovedEventData> {
  readonly name = 'CartItemRemoved';
  readonly version = 1;

  constructor(data: CartItemRemovedEventData) {
    super(data);
  }
}
