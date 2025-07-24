import { Injectable } from '@nestjs/common';
import { IAggregateFactory } from '@wings-corporation/domain';

import { CartAggregate, CartProps, CartRequiredProps } from '../cart.aggregate';

@Injectable()
export class CartFactory implements IAggregateFactory<string, CartAggregate> {
  public create(props: CartRequiredProps): CartAggregate {
    return CartAggregate.create(props);
  }

  public reconstitute(props: CartProps, id: string): CartAggregate {
    return CartAggregate.reconstitute(props, id);
  }
}
