import { BrandSearchReadModel } from '@wings-online/product-catalog/read-models';

export class SearchBrandsResult {
  readonly data: BrandSearchReadModel[];

  constructor(props: BrandSearchReadModel[]) {
    this.data = props;
  }
}
