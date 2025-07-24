import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListVouchersQueryProps {
  readonly identity: UserIdentity;
}

export class ListVouchersQuery
  extends ListVouchersQueryProps
  implements IQuery
{
  constructor(props: ListVouchersQueryProps) {
    super();
    Object.assign(this, props);
  }
}
