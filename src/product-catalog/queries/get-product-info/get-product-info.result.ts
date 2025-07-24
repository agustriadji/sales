import { ProductReadModel } from '@wings-online/product-catalog/read-models';

export class GetProductInfoResult {
  readonly data: ProductReadModel;

  constructor(props: ProductReadModel) {
    this.data = props;
  }
}
