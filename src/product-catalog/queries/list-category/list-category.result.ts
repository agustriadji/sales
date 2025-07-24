import { CategoryReadModel } from '@wings-online/product-catalog/read-models';

export class ListCategoryResult {
  readonly data: CategoryReadModel[];

  constructor(props: CategoryReadModel[]) {
    this.data = props;
  }
}
