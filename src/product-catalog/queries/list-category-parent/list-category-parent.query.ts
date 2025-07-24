import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListCategoryParentQueryProps {
  readonly identity: UserIdentity;
}
export class ListCategoryParentQuery
  extends ListCategoryParentQueryProps
  implements IQuery
{
  constructor(props: ListCategoryParentQueryProps) {
    super();
    Object.assign(this, props);
  }
}
