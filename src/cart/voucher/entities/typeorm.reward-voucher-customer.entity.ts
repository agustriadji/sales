import { Entity, OneToOne, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmRewardVoucherMaterialEntity } from './typeorm.reward-voucher-material.entity';
import { TypeOrmRewardVoucherEntity } from './typeorm.reward-voucher.entity';

@Entity({ schema: 'public', name: 'm_reward_voucher_custgrp' })
export class TypeOrmRewardVoucherCustomerEntity {
  @PrimaryColumn()
  readonly rewardVoucherId: string;

  @PrimaryColumn({ type: 'int' })
  readonly rewardVoucherMatId: number;

  @PrimaryColumn()
  readonly slsOffice: string;

  @PrimaryColumn()
  readonly custGroup: string;

  @PrimaryColumn()
  readonly custId: string;

  @OneToOne('TypeOrmRewardVoucherEntity', 'customer')
  readonly voucher: Relation<TypeOrmRewardVoucherEntity>;

  @OneToOne('TypeOrmRewardVoucherMaterialEntity', 'customer')
  readonly material?: Relation<TypeOrmRewardVoucherMaterialEntity>;
}
