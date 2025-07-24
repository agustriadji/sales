import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';
import { WishlistId } from '@wings-online/wishlist/domains';

export class ListWishlistItemsQueryProps {
  readonly id: WishlistId;
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
}

export class ListWishlistItemsQuery
  extends ListWishlistItemsQueryProps
  implements IQuery
{
  constructor(props: ListWishlistItemsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
