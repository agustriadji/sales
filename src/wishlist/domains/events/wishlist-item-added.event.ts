import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type WishlistItemAddedEventData = {
  identity: UserIdentity;
  wishlistItemId: string;
  wishlistId: string;
  itemId: string;
};

export class WishlistItemAdded extends DomainEvent<WishlistItemAddedEventData> {
  readonly name = 'WishlistItemAdded';
  readonly version = 1;

  constructor(data: WishlistItemAddedEventData) {
    super(data);
  }
}
