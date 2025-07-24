import { Column, Entity, OneToOne, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmUserEntity } from './typeorm.user.entity';

@Entity({ schema: 'public', name: 'customer_default_delivery_address' })
export class TypeOrmUserDefaultAddressEntity {
  @PrimaryColumn({ type: 'uuid', name: 'customer_id' })
  readonly userExternalId: string;

  @OneToOne(() => TypeOrmUserEntity, (user) => user.defaultAddress)
  readonly user?: Relation<TypeOrmUserEntity>;

  @Column({ name: 'default_dry_delivery_address_id', type: 'uuid' })
  readonly defaultDryAddressId?: string;

  @Column({ name: 'default_frozen_delivery_address_id', type: 'uuid' })
  readonly defaultFrozenAddressId?: string;
}
