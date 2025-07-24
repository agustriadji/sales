import { IQuery } from '@nestjs/cqrs';
import { IPage, WithIdentity } from '@wings-corporation/core';
import { BannerFilterCondition } from '@wings-online/banner/interfaces/banner-filter.interface';
import { UserIdentity } from '@wings-online/common';

export class ListBannersQueryProps
  implements Partial<IPage>, WithIdentity<UserIdentity>
{
  readonly identity: UserIdentity;
  readonly page?: number;
  readonly pageSize?: number;
  readonly filter?: BannerFilterCondition;
}

export class ListBannersQuery extends ListBannersQueryProps implements IQuery {
  constructor(props: ListBannersQueryProps) {
    super();
    Object.assign(this, props);
  }
}
