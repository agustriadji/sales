import { Division } from '@wings-corporation/core';

import { DeliveryAddressReadModel } from '../read-models';

export type GetBuyerAddressesParams = {
  buyerExternalId: string;
  type: Division;
  limit?: number;
};

export interface IBuyerReadRepository {
  /**
   *
   * @param params
   *
   */
  getBuyerAddresses(
    params: GetBuyerAddressesParams,
  ): Promise<DeliveryAddressReadModel[]>;
}
