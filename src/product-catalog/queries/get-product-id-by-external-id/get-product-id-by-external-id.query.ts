import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class GetProductIdByExternalIdQueryProps {
  readonly identity: UserIdentity;
  readonly externalId: string;
}

export class GetProductIdByExternalIdQuery
  extends GetProductIdByExternalIdQueryProps
  implements IQuery
{
  constructor(props: GetProductIdByExternalIdQueryProps) {
    super();
    Object.assign(this, props);
  }
}
