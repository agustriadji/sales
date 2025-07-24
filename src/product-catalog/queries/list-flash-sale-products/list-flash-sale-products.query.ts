import { IQuery } from '@nestjs/cqrs';
import { IPage, WithIdentity } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';
import {
  ProductFilterCondition,
  ProductSortCondition,
} from '@wings-online/product-catalog/interfaces';
import { FlashSaleStatus } from '@wings-online/product-catalog/promotion';

export class ListFlashSaleProductsQueryProps
  implements Partial<IPage>, WithIdentity<UserIdentity>
{
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
  readonly filter?: ProductFilterCondition;
  readonly sort?: ProductSortCondition;
  readonly status: FlashSaleStatus;
}

export class ListFlashSaleProductsQuery
  extends ListFlashSaleProductsQueryProps
  implements IQuery
{
  constructor(props: ListFlashSaleProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
