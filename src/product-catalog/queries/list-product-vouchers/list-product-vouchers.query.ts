import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListProductVouchersQueryProps {
  readonly identity: UserIdentity;
  readonly id: string;
}

export class ListProductVouchersQuery
  extends ListProductVouchersQueryProps
  implements IQuery
{
  constructor(props: ListProductVouchersQueryProps) {
    super();
    Object.assign(this, props);
  }
}
