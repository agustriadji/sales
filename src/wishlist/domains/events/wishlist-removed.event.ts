import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type WishlistRemovedEventData = {
  identity: UserIdentity;
  wishlistId: string;
  itemIds: string[];
};

export class WishlistRemoved extends DomainEvent<WishlistRemovedEventData> {
  readonly name = 'WishlistRemoved';
  readonly version = 1;

  constructor(data: WishlistRemovedEventData) {
    super(data);
  }
}
