import { FilterReadModel } from '@wings-online/product-catalog/read-models';

export class GetFilterResult {
  readonly data: FilterReadModel;

  constructor(props: FilterReadModel) {
    this.data = props;
  }
}
