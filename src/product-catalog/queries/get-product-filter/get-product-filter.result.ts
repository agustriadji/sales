import { FilterState } from '@wings-online/product-catalog/read-models';

export class GetProductFilterResult {
  readonly data: FilterState;

  constructor(data: FilterState) {
    this.data = data;
  }

  toJSON() {
    return {
      data: this.data.toJSON(),
    };
  }
}
