import { Collection } from '@wings-corporation/core';
import { CartType } from '@wings-online/cart/cart.constants';
import { UserIdentity } from '@wings-online/common';

import { FreeProductReadModel, VoucherReadModel } from '../read-models';

export interface IVoucherReadRepository {
  listVouchers(identity: UserIdentity): Promise<Collection<VoucherReadModel>>;
  listFreeProductVouchers(
    identity: UserIdentity,
    type: CartType,
  ): Promise<FreeProductReadModel[]>;
}
