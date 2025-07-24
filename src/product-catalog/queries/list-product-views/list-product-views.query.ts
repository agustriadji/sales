import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListProductViewsQueryProps {
  readonly identity: UserIdentity;
  readonly categoryId?: string;
}

export class ListProductViewsQuery
  extends ListProductViewsQueryProps
  implements IQuery
{
  constructor(props: ListProductViewsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
