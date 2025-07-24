import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { DeliveryAddressType } from '../cart.constants';
import { TypeOrmBuyerEntity } from './typeorm.buyer.entity';
import { TypeOrmCartEntity } from './typeorm.cart.entity';

@Entity({ schema: 'public', name: 'customer_delivery_address' })
export class TypeOrmDeliveryAddressEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ name: 'customer_id' })
  readonly buyerExternalId: string;

  @ManyToOne(() => TypeOrmBuyerEntity, (buyer) => buyer.addresses)
  @JoinColumn({ name: 'customer_id' })
  readonly buyer: Relation<TypeOrmBuyerEntity>;

  @Column()
  readonly type: DeliveryAddressType;

  @OneToOne(() => TypeOrmCartEntity, (cart) => cart.deliveryAddress)
  readonly cart: Relation<TypeOrmCartEntity>;

  @Column()
  readonly label: string;

  @Column()
  readonly name: string;

  @Column()
  readonly address: string;
}
