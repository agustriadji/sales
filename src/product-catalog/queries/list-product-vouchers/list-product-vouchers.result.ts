import { VoucherReadModel } from '@wings-online/product-catalog/read-models';

export class ListProductVouchersResult {
  readonly data: VoucherReadModel[];

  constructor(props: VoucherReadModel[]) {
    this.data = props;
  }
}
