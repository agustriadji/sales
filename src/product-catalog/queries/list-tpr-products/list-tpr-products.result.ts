import {
  PaginatedCollection,
  PaginatedQueryResult,
} from '@wings-corporation/core';
import {
  JsonProductProps,
  ProductReadModel,
} from '@wings-online/product-catalog/read-models';

export class ListTPRProductsResult extends PaginatedQueryResult<ProductReadModel> {
  readonly products: JsonProductProps[];

  constructor(props: PaginatedCollection<ProductReadModel>) {
    super(props);
    this.products = props.data.map((product) => product.toJSON());
  }
}
