import { CorrelatableCommand } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class RemoveWishlistItemCommandProps {
  readonly identity: UserIdentity;
  readonly wishlistId?: string;
  readonly itemId: string;
}

export class RemoveWishlistItemCommand extends CorrelatableCommand<RemoveWishlistItemCommandProps> {
  constructor(data: RemoveWishlistItemCommandProps) {
    super(data);
  }
}
