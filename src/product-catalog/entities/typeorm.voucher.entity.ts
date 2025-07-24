import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { VoucherType } from '@wings-online/app.constants';
import { BenefitType } from '@wings-online/common';

import { TypeOrmCustomerRewardEntity } from './typeorm.customer-reward.entity';
import { TypeOrmVoucherTargetEntity } from './typeorm.voucher-target.entity';

export type LegacyVoucherType = 'Discount' | 'Free Product';
export type LegacyDiscountType = 'Percentage' | 'Nominal';
export type LegacyVoucherStatus = 'Active' | 'Inactive';

@Entity({ schema: 'public', name: 'm_reward_voucher' })
export class TypeOrmVoucherEntity {
  @PrimaryColumn({ name: 'reward_voucher_id' })
  readonly id: string;

  @Column({
    select: false,
    transformer: {
      to(value: VoucherType): LegacyVoucherType {
        return value === 'DISCOUNT' ? 'Discount' : 'Free Product';
      },
      from(value: LegacyVoucherType): VoucherType {
        return value === 'Discount' ? 'DISCOUNT' : 'FREE_PRODUCT';
      },
    },
  })
  readonly type: VoucherType;

  @Column({ select: false })
  readonly isGeneral: boolean;

  @Column({
    name: 'discount_type',
    transformer: {
      to(value: BenefitType): LegacyDiscountType {
        return value === 'AMOUNT' ? 'Nominal' : 'Percentage';
      },
      from(value: LegacyDiscountType): BenefitType {
        return value === 'Nominal' ? 'AMOUNT' : 'PERCENTAGE';
      },
    },
  })
  readonly benefitType: BenefitType;

  @Column({ name: 'amount' })
  readonly benefitValue: number;

  @Column({ name: 'min_purchase_amount' })
  readonly minimumPurchaseAmount: number;

  @Column({ name: 'max_discount' })
  readonly maximumDiscount: number;

  @Column({ select: false })
  readonly status: LegacyVoucherStatus;

  @OneToMany(() => TypeOrmVoucherTargetEntity, (target) => target.voucher)
  readonly target: Relation<TypeOrmVoucherTargetEntity>;

  @OneToOne(() => TypeOrmCustomerRewardEntity, (entity) => entity.voucher)
  @JoinColumn({
    name: 'reward_voucher_id',
    referencedColumnName: 'voucherId',
  })
  readonly customerReward: Relation<TypeOrmCustomerRewardEntity>;
}
