import { CorrelatableCommand } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class AddWishlistItemsCommandProps {
  readonly identity: UserIdentity;
  readonly wishlistId?: string;
  readonly itemIds: string[];
}

export class AddWishlistItemsCommand extends CorrelatableCommand<AddWishlistItemsCommandProps> {
  constructor(data: AddWishlistItemsCommandProps) {
    super(data);
  }
}
