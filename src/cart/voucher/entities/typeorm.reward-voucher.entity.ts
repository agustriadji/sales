import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmCartVoucherEntity } from '@wings-online/cart/entities';
import { NumberTransformer } from '@wings-online/common';

import { VoucherDiscountType, VoucherStatus, VoucherType } from '../interfaces';
import { TypeOrmRewardVoucherCustomerEntity } from './typeorm.reward-voucher-customer.entity';
import { TypeOrmVoucherRedemptionEntity } from './typeorm.voucher-redemption.entity';

@Entity({ schema: 'public', name: 'm_reward_voucher' })
export class TypeOrmRewardVoucherEntity {
  @PrimaryColumn()
  readonly rewardVoucherId: string;

  @Column({ enum: VoucherType, type: 'varchar' })
  readonly type: VoucherType;

  @Column({ enum: VoucherDiscountType, type: 'varchar' })
  readonly discountType: VoucherDiscountType;

  @Column()
  readonly isGeneral: boolean;

  @Column({ type: 'numeric', transformer: new NumberTransformer() })
  readonly amount: number;

  @Column({ type: 'numeric', transformer: new NumberTransformer() })
  readonly minPurchaseAmount: number;

  @Column()
  readonly minPurchaseQty: number;

  @Column()
  readonly minPurchaseUom: string;

  @Column()
  readonly maxDiscount?: number;

  @Column()
  readonly qty: number;

  @Column()
  readonly uom: string;

  @Column()
  readonly expiredIn: number;

  @Column({ enum: VoucherStatus, type: 'varchar' })
  readonly status: VoucherStatus;

  @CreateDateColumn({ type: 'timestamp' })
  readonly createdDate: Date;

  @OneToOne('TypeOrmRewardVoucherCustomerEntity', 'voucher')
  @JoinColumn({
    name: 'reward_voucher_id',
    referencedColumnName: 'rewardVoucherId',
  })
  readonly customer: Relation<TypeOrmRewardVoucherCustomerEntity>;

  @OneToMany('TypeOrmCartVoucherEntity', 'voucher')
  readonly carts: Relation<TypeOrmCartVoucherEntity[]>;

  @OneToMany('TypeOrmVoucherRedemptionEntity', 'voucher')
  readonly redemptions: Relation<TypeOrmVoucherRedemptionEntity[]>;
}
