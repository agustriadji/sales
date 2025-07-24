import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type CartClearedEventData = {
  cartId: string;
  identity: UserIdentity;
};

export class CartCleared extends DomainEvent<CartClearedEventData> {
  readonly name = 'CartCleared';
  readonly version = 1;

  constructor(data: CartClearedEventData) {
    super(data);
  }
}
