import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListBestSellerProductsQueryProps {
  readonly identity: UserIdentity;
  readonly categoryId?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export class ListBestSellerProductsQuery
  extends ListBestSellerProductsQueryProps
  implements IQuery
{
  constructor(props: ListBestSellerProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
