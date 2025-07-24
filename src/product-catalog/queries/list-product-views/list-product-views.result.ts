import { ProductViewReadModel } from '@wings-online/product-catalog/read-models';

export class ListProductViewsResult {
  readonly data: ProductViewReadModel[];

  constructor(props: ProductViewReadModel[]) {
    this.data = props;
  }
}
