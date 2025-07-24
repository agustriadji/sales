import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class GetProductByBarcodeQueryProps {
  readonly identity: UserIdentity;
  readonly barcode: string;
}

export class GetProductByBarcodeQuery
  extends GetProductByBarcodeQueryProps
  implements IQuery
{
  constructor(props: GetProductByBarcodeQueryProps) {
    super();
    Object.assign(this, props);
  }
}
