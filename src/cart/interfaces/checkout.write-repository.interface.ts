import {
  ICartVoucherAggregate,
  ICheckoutAggregate,
} from '@wings-online/cart/domains';
import { UserIdentity } from '@wings-online/common';

import { CartType } from '../cart.constants';

export interface ICheckoutWriteRepository {
  /**
   *
   * @param type
   * @param identity
   */
  getCart<T = ICheckoutAggregate | ICartVoucherAggregate>(
    type: CartType,
    identity: UserIdentity,
  ): Promise<T | undefined>;

  /**
   *
   * @param identity
   * @returns
   */
  getCarts<TAggregate = ICheckoutAggregate | ICartVoucherAggregate>(
    identity: UserIdentity,
  ): Promise<TAggregate[]>;

  /**
   *
   * @param aggregate
   */
  delete(aggregate: ICheckoutAggregate): Promise<void>;
}
