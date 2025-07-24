import { Nullable } from '@wings-corporation/core';
import { EntityId } from '@wings-corporation/domain';

import { DeliveryAddressType } from '../cart.constants';

export type DeliveryAddressId = EntityId<string>;

export interface DeliveryAddress {
  id: DeliveryAddressId;
  name: string;
  label: Nullable<string>;
  address: string;
  type: DeliveryAddressType;
}
