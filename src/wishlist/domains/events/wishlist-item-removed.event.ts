import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type WishlistItemRemovedEventData = {
  identity: UserIdentity;
  wishlistItemId: string;
  wishlistId: string;
  itemId: string;
};

export class WishlistItemRemoved extends DomainEvent<WishlistItemRemovedEventData> {
  readonly name = 'WishlistItemRemoved';
  readonly version = 1;

  constructor(data: WishlistItemRemovedEventData) {
    super(data);
  }
}
