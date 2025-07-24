import { IQuery } from '@nestjs/cqrs';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

export class GetCartInfoQueryProps {
  readonly identity: UserIdentity;
  readonly type: CartType;
}

export class GetCartInfoQuery extends GetCartInfoQueryProps implements IQuery {
  constructor(props: GetCartInfoQueryProps) {
    super();
    Object.assign(this, props);
  }
}
