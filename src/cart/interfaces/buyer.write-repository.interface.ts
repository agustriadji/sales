import { DeliveryAddress } from '.';

import { Division } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export type IsBuyerAddressExistsParams = {
  buyerId: string;
  deliveryAddressId: string;
  type: Division;
};

export interface IBuyerWriteRepository {
  isBuyerAddressExists(params: IsBuyerAddressExistsParams): Promise<boolean>;

  /**
   *
   * @param params
   *
   */
  getBuyerAddresses(identity: UserIdentity): Promise<DeliveryAddress[]>;
}
