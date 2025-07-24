import { BrandReadModel } from '@wings-online/product-catalog/read-models';

export class ListBrandResult {
  readonly data: BrandReadModel[];

  constructor(props: BrandReadModel[]) {
    this.data = props;
  }
}
