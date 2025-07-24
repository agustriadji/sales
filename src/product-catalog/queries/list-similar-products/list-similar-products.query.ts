import { IQuery } from '@nestjs/cqrs';
import { IPage, WithIdentity } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';
import {
  ProductFilterCondition,
  ProductSortCondition,
} from '@wings-online/product-catalog/interfaces';

export class ListSimilarProductsQueryProps
  implements Partial<IPage>, WithIdentity<UserIdentity>
{
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
  readonly filter?: ProductFilterCondition;
  readonly sort?: ProductSortCondition;
  readonly categoryId?: number;
}

export class ListSimilarProductsQuery
  extends ListSimilarProductsQueryProps
  implements IQuery
{
  constructor(props: ListSimilarProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
