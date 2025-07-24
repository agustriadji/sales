import {
  FreeProductReadModel,
  JsonProductProps,
} from '@wings-online/cart/voucher/read-models';

export class ListFreeProductsResult {
  readonly data: Array<JsonProductProps>;

  constructor(props: Array<FreeProductReadModel>) {
    this.data = props.map((x) => x.toJSON());
  }
}
