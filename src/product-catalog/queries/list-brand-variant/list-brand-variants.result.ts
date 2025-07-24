import { VariantReadModel } from '@wings-online/product-catalog/read-models';

export class ListBrandVariantsResult {
  readonly data: VariantReadModel[];

  constructor(props: VariantReadModel[]) {
    this.data = props;
  }
}
