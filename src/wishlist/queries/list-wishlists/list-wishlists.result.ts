import { Collection } from '@wings-corporation/core';
import { CursorPaginationQueryResult } from '@wings-online/common';
import { WishlistReadModel } from '@wings-online/wishlist/read-models';

export class ListWishlistsResult extends CursorPaginationQueryResult<WishlistReadModel> {
  constructor(props: Collection<WishlistReadModel>) {
    super(props);
  }
}
