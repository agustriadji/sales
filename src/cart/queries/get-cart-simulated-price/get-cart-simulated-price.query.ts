import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class GetCartSimulatedPriceQueryProps {
  readonly identity: UserIdentity;
}

export class GetCartSimulatedPriceQuery
  extends GetCartSimulatedPriceQueryProps
  implements IQuery
{
  constructor(props: GetCartSimulatedPriceQueryProps) {
    super();
    Object.assign(this, props);
  }
}
