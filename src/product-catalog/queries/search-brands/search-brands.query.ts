import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';
import { CategoryTypes } from '@wings-online/product-catalog/product-catalog.constants';

export class SearchBrandsQueryProps {
  readonly identity: UserIdentity;
  readonly search: string;
  readonly limit?: number;
  readonly type?: CategoryTypes;
}

export class SearchBrandsQuery
  extends SearchBrandsQueryProps
  implements IQuery
{
  constructor(props: SearchBrandsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
