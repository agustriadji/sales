import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';
import {
  ProductFilterCondition,
  ProductSortCondition,
} from '@wings-online/product-catalog/interfaces';

export class ListCategoryProductsQueryProps {
  readonly categoryId: string;
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
  readonly filter?: ProductFilterCondition;
  readonly sort?: ProductSortCondition;
}

export class ListCategoryProductsQuery
  extends ListCategoryProductsQueryProps
  implements IQuery
{
  constructor(props: ListCategoryProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
