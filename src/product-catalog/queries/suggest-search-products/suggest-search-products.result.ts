import { SuggestProductSearchReadModel } from '@wings-online/product-catalog/read-models';

export class SuggestSearchProductsResult {
  readonly data: SuggestProductSearchReadModel;

  constructor(props: SuggestProductSearchReadModel) {
    this.data = props;
  }
}
