import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListBrandVariantsQueryProps {
  readonly id: number;
  readonly identity: UserIdentity;
  readonly activeItemId?: string;
}

export class ListBrandVariantsQuery
  extends ListBrandVariantsQueryProps
  implements IQuery
{
  constructor(props: ListBrandVariantsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
