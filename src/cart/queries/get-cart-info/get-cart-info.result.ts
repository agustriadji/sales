import { CartReadModel } from '@wings-online/cart/read-models';

export class GetCartInfoResult {
  readonly data: CartReadModel;

  constructor(props: CartReadModel) {
    this.data = props;
  }
}
