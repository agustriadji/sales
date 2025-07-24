import { IQuery } from '@nestjs/cqrs';
import { IPage, WithIdentity } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';
import {
  ProductFilterCondition,
  ProductSortCondition,
} from '@wings-online/product-catalog/interfaces';

export class ListFrequentlyPurchasedProductsQueryProps
  implements Partial<IPage>, WithIdentity<UserIdentity>
{
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
  readonly filter?: ProductFilterCondition;
  readonly sort?: ProductSortCondition;
}

export class ListFrequentlyPurchasedProductsQuery
  extends ListFrequentlyPurchasedProductsQueryProps
  implements IQuery
{
  constructor(props: ListFrequentlyPurchasedProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
