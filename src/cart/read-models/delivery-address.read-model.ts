import { EntityId } from '@wings-corporation/domain';

export interface DeliveryAddressReadModel {
  id: EntityId<string>;
  label: string;
  name: string;
  address: string;
}
