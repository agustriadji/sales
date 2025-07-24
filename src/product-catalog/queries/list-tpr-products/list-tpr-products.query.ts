import { IQuery } from '@nestjs/cqrs';
import { IPage, WithIdentity } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';
import {
  ProductFilterCondition,
  ProductSortCondition,
} from '@wings-online/product-catalog/interfaces';

export class ListTPRProductsQueryProps
  implements Partial<IPage>, WithIdentity<UserIdentity>
{
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
  readonly filter?: ProductFilterCondition;
  readonly sort?: ProductSortCondition;
  readonly search?: string;
}

export class ListTPRProductsQuery
  extends ListTPRProductsQueryProps
  implements IQuery
{
  constructor(props: ListTPRProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
