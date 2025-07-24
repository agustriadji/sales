import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmRewardVoucherEntity } from '@wings-online/cart/voucher/entities';

import { TypeOrmCartEntity } from './typeorm.cart.entity';

@Entity({ schema: 'sales', name: 'cart_voucher' })
export class TypeOrmCartVoucherEntity {
  @PrimaryColumn({ type: 'uuid' })
  public readonly cartId: string;

  @ManyToOne('TypeOrmCartEntity', 'vouchers')
  @JoinColumn({ name: 'cart_id' })
  public readonly cart: Relation<TypeOrmCartEntity>;

  @PrimaryColumn()
  public readonly voucherId: string;

  @ManyToOne('TypeOrmRewardVoucherEntity', 'carts')
  @JoinColumn({ name: 'voucher_id', referencedColumnName: 'rewardVoucherId' })
  public readonly voucher: Relation<TypeOrmRewardVoucherEntity>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public readonly createdAt: Date;
}
