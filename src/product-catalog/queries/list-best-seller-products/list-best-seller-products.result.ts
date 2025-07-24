import { Collection } from '@wings-corporation/core';
import { CursorPaginationQueryResult } from '@wings-online/common';
import { ProductReadModel } from '@wings-online/product-catalog/read-models';

export class ListBestSellerProductsResult extends CursorPaginationQueryResult<ProductReadModel> {
  constructor(props: Collection<ProductReadModel>) {
    super(props);
  }
}
