import { IQuery } from '@nestjs/cqrs';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export class ListCartItemsQueryProps {
  readonly identity: UserIdentity;
  readonly limit: number;
  readonly cursor?: string;
  readonly type: CartType;
}

export class ListCartItemsQuery
  extends ListCartItemsQueryProps
  implements IQuery
{
  constructor(props: ListCartItemsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
