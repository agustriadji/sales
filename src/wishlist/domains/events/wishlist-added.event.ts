import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type WishlistAddedEventData = {
  identity: UserIdentity;
  wishlistId: string;
};

export class WishlistAdded extends DomainEvent<WishlistAddedEventData> {
  readonly name = 'WishlistAdded';
  readonly version = 1;

  constructor(data: WishlistAddedEventData) {
    super(data);
  }
}
