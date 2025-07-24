import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListProductPromotionsQueryProps {
  readonly identity: UserIdentity;
  readonly id: string;
}

export class ListProductPromotionsQuery
  extends ListProductPromotionsQueryProps
  implements IQuery
{
  constructor(props: ListProductPromotionsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
