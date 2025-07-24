import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'customer_default_delivery_address' })
export class TypeOrmDefaultDeliveryAddressEntity {
  @PrimaryColumn({ type: 'uuid', name: 'customer_id' })
  readonly buyerExternalId: string;

  @Column({ name: 'default_dry_delivery_address_id', type: 'uuid' })
  readonly defaultDryAddressId?: string;

  @Column({ name: 'default_frozen_delivery_address_id', type: 'uuid' })
  readonly defaultFrozenAddressId?: string;
}
