import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmBuyerInfoEntity } from './typeorm.buyer-info.entity';
import { TypeOrmCartEntity } from './typeorm.cart.entity';
import { TypeOrmDeliveryAddressEntity } from './typeorm.delivery-address.entity';

@Entity({ schema: 'sales', name: 'buyer' })
export class TypeOrmBuyerEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly externalId: string;

  @Column()
  readonly isActive: boolean;

  @OneToMany(() => TypeOrmBuyerInfoEntity, (info) => info.buyer)
  @JoinColumn({ name: 'id' })
  readonly infos: Relation<TypeOrmBuyerInfoEntity[]>;

  @OneToMany(() => TypeOrmCartEntity, (cart) => cart.buyer)
  readonly carts: Relation<TypeOrmCartEntity[]>;

  @OneToMany(() => TypeOrmDeliveryAddressEntity, (address) => address.buyer)
  @JoinColumn({ name: 'external_id' })
  readonly addresses: Relation<TypeOrmDeliveryAddressEntity[]>;
}
