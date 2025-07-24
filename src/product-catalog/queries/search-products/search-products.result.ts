import { ProductSearchReadModel } from '@wings-online/product-catalog/read-models';

export class SearchProductsResult {
  readonly data: ProductSearchReadModel[];

  constructor(props: ProductSearchReadModel[]) {
    this.data = props;
  }
}
