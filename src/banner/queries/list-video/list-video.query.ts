import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class ListVideoQueryProps {
  readonly identity: UserIdentity;
}

export class ListVideoQuery extends ListVideoQueryProps implements IQuery {
  constructor(props: ListVideoQueryProps) {
    super();
    Object.assign(this, props);
  }
}
