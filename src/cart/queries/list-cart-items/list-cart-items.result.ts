import { Collection } from '@wings-corporation/core';
import { CartItemReadModel } from '@wings-online/cart/read-models';
import { CursorPaginationQueryResult } from '@wings-online/common';

export class ListCartItemsResult extends CursorPaginationQueryResult<CartItemReadModel> {
  constructor(props: Collection<CartItemReadModel>) {
    super(props);
  }
}
