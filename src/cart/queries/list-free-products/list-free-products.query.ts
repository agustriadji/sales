import { IQuery } from '@nestjs/cqrs';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export class ListFreeProductsQueryProps {
  readonly identity: UserIdentity;
  readonly type: CartType;
}

export class ListFreeProductsQuery
  extends ListFreeProductsQueryProps
  implements IQuery
{
  constructor(props: ListFreeProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
