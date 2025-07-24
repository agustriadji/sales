import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';
import { CategorySortCondition } from '@wings-online/product-catalog/interfaces';

export class ListCategoryProps {
  readonly identity: UserIdentity;
  readonly sort?: CategorySortCondition;
}
export class ListCategoryQuery extends ListCategoryProps implements IQuery {
  constructor(props: ListCategoryProps) {
    super();
    Object.assign(this, props);
  }
}
