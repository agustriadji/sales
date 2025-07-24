import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';
import { CategoryTypes } from '@wings-online/product-catalog/product-catalog.constants';

export class ListBrandQueryProps {
  readonly identity: UserIdentity;
  readonly type?: CategoryTypes;
}
export class ListBrandQuery extends ListBrandQueryProps implements IQuery {
  constructor(props: ListBrandQueryProps) {
    super();
    Object.assign(this, props);
  }
}
