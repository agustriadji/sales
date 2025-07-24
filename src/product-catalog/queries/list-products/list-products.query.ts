import { IQuery } from '@nestjs/cqrs';
import { IPage, WithIdentity } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';
import {
  ProductFilterCondition,
  ProductSortCondition,
} from '@wings-online/product-catalog/interfaces';

export class ListProductsQueryProps
  implements Partial<IPage>, WithIdentity<UserIdentity>
{
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
  readonly filter?: ProductFilterCondition;
  readonly sort?: ProductSortCondition;
  readonly search?: string;
  readonly excludeInsideCart?: boolean;
}

export class ListProductsQuery
  extends ListProductsQueryProps
  implements IQuery
{
  constructor(props: ListProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
