import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

export type WishlistRenamedEventData = {
  identity: UserIdentity;
  wishlistId: string;
};

export class WishlistRenamed extends DomainEvent<WishlistRenamedEventData> {
  readonly name = 'WishlistRenamed';
  readonly version = 1;

  constructor(data: WishlistRenamedEventData) {
    super(data);
  }
}
