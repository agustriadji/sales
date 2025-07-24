import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

import { Division } from '@wings-corporation/core';

import { TypeOrmBuyerEntity } from './typeorm.buyer.entity';
import { TypeOrmCartItemEntity } from './typeorm.cart-item.entity';
import { TypeOrmCartTagEntity } from './typeorm.cart-tag.entity';
import { TypeOrmCartVoucherEntity } from './typeorm.cart-voucher.entity';
import { TypeOrmDeliveryAddressEntity } from './typeorm.delivery-address.entity';

@Entity({ schema: 'sales', name: 'cart' })
export class TypeOrmCartEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ type: 'uuid' })
  readonly buyerId: string;

  @ManyToOne(() => TypeOrmBuyerEntity, (buyer) => buyer.carts)
  readonly buyer: Relation<TypeOrmBuyerEntity>;

  @Column({ type: 'uuid' })
  readonly deliveryAddressId?: string;

  @Column()
  readonly type: Division;

  @ManyToOne(() => TypeOrmDeliveryAddressEntity, (address) => address.cart)
  @JoinColumn({ name: 'delivery_address_id' })
  readonly deliveryAddress?: Relation<TypeOrmDeliveryAddressEntity>;

  @OneToMany(() => TypeOrmCartItemEntity, (items) => items.cart)
  readonly items: Relation<TypeOrmCartItemEntity[]>;

  @OneToMany(() => TypeOrmCartTagEntity, (tags) => tags.cart)
  readonly tags: Relation<TypeOrmCartTagEntity[]>;

  @OneToMany(() => TypeOrmCartVoucherEntity, (vouchers) => vouchers.cart)
  readonly vouchers: Relation<TypeOrmCartVoucherEntity[]>;

  @UpdateDateColumn({ type: 'timestamp' })
  readonly updatedAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  readonly simulatedAt: Date;
}
