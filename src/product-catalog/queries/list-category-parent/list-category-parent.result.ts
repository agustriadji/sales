import { CategoryParentReadModel } from '@wings-online/product-catalog/read-models';

export class ListCategoryParentResult {
  readonly data: CategoryParentReadModel[];

  constructor(props: CategoryParentReadModel[]) {
    this.data = props;
  }
}
