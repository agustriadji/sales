import { DateTime } from 'luxon';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { VoucherRedemptionStatus } from '../interfaces';
import { TypeOrmRewardVoucherEntity } from './typeorm.reward-voucher.entity';

@Entity({ schema: 'public', name: 't_cust_reward' })
export class TypeOrmVoucherRedemptionEntity {
  @PrimaryColumn()
  readonly custRewardId: string;

  @Column()
  readonly custId: string;

  @Column()
  readonly rewardVoucherId: string;

  @Column()
  readonly rewardProductId: string;

  @Column()
  readonly docNo: string;

  @Column()
  readonly usedDate: Date;

  @Column()
  readonly updatedDate: Date;

  @Column()
  readonly status: VoucherRedemptionStatus;

  @Column({
    type: 'date',
    transformer: {
      from(value: string): Date {
        return DateTime.fromFormat(value, 'yyyy-MM-dd').toJSDate();
      },
      to(value) {
        throw new Error('not implemented');
      },
    },
  })
  readonly expiredDate: Date;

  @ManyToOne('TypeOrmRewardVoucherEntity', 'redemptions')
  @JoinColumn({ name: 'reward_voucher_id' })
  readonly voucher: Relation<TypeOrmRewardVoucherEntity>;
}
