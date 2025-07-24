import {
  PaginatedCollection,
  PaginatedQueryResult,
} from '@wings-corporation/core';
import {
  JsonProductProps,
  ProductReadModel,
} from '@wings-online/product-catalog/read-models';

export class ListWishlistItemsResult extends PaginatedQueryResult<ProductReadModel> {
  readonly data: JsonProductProps[];

  constructor(props: PaginatedCollection<ProductReadModel>) {
    super(props);
    this.data = props.data.map((x) => x.toJSON());
  }
}
