import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListWishlistsQueryProps {
  readonly identity: UserIdentity;
  readonly limit?: number;
  readonly cursor?: string;
}

export class ListWishlistsQuery
  extends ListWishlistsQueryProps
  implements IQuery
{
  constructor(props: ListWishlistsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
