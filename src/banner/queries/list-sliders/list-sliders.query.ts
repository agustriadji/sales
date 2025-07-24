import { IQuery } from '@nestjs/cqrs';
import { WithIdentity } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class ListSlidersQueryProps implements WithIdentity<UserIdentity> {
  readonly identity: UserIdentity;
}

export class ListSlidersQuery extends ListSlidersQueryProps implements IQuery {
  constructor(props: ListSlidersQueryProps) {
    super();
    Object.assign(this, props);
  }
}
