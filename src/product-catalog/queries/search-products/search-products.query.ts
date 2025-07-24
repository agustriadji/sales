import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class SearchProductsQueryProps {
  readonly search: string;
  readonly identity: UserIdentity;
  readonly categoryId?: number;
  readonly limit?: number;
}

export class SearchProductsQuery
  extends SearchProductsQueryProps
  implements IQuery
{
  constructor(props: SearchProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
