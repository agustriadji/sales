import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class GetProductInfoQueryProps {
  readonly identity: UserIdentity;
  readonly id: string;
}

export class GetProductInfoQuery
  extends GetProductInfoQueryProps
  implements IQuery
{
  constructor(props: GetProductInfoQueryProps) {
    super();
    Object.assign(this, props);
  }
}
