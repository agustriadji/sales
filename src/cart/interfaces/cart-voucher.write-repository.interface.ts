import { ICartVoucherAggregate } from '@wings-online/cart/domains';

import { ICheckoutWriteRepository } from './checkout.write-repository.interface';

export interface ICartVoucherWriteRepository extends ICheckoutWriteRepository {
  save(cart: ICartVoucherAggregate): Promise<void>;
}
