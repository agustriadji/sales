import { Entity, JoinColumn, OneToOne, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmVoucherMaterialEntity } from './typeorm.voucher-material.entity';
import { TypeOrmVoucherEntity } from './typeorm.voucher.entity';

@Entity({ schema: 'public', name: 'm_reward_voucher_custgrp' })
export class TypeOrmVoucherTargetEntity {
  @PrimaryColumn()
  readonly rewardVoucherId: string;

  @PrimaryColumn({ type: 'int' })
  readonly rewardVoucherMatId: number;

  @PrimaryColumn()
  readonly slsOffice: string;

  @PrimaryColumn()
  readonly custGroup: string;

  @PrimaryColumn({ name: 'cust_id' })
  readonly customerExternalId: string;

  @OneToOne(() => TypeOrmVoucherEntity, (voucher) => voucher.target)
  @JoinColumn({
    name: 'reward_voucher_id',
    referencedColumnName: 'id',
  })
  readonly voucher: Relation<TypeOrmVoucherEntity>;

  @OneToOne(() => TypeOrmVoucherMaterialEntity, (material) => material.target)
  readonly material: Relation<TypeOrmVoucherMaterialEntity>;
}
