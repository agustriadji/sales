import { Injectable } from '@nestjs/common';
import { IAggregateFactory } from '@wings-corporation/domain';

import {
  CheckoutAggregate,
  CheckoutRequiredProps,
  ReconstituteCheckoutProps,
} from '../checkout.aggregate';

@Injectable()
export class CheckoutFactory
  implements IAggregateFactory<string, CheckoutAggregate>
{
  // constructor(
  //   @InjectPinoLogger('CheckoutAggregate') private readonly logger: PinoLogger,
  // ) {}

  public create(props: CheckoutRequiredProps): CheckoutAggregate {
    return CheckoutAggregate.create(
      props,
      //  this.logger
    );
  }

  public reconstitute(
    props: ReconstituteCheckoutProps,
    id: string,
  ): CheckoutAggregate {
    return CheckoutAggregate.reconstitute(
      props,
      id,
      // this.logger
    );
  }
}
