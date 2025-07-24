import { DateTime } from 'luxon';
import { Column, Entity, OneToOne, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmVoucherEntity } from './typeorm.voucher.entity';

export type LegacyCustomerRewardType = 'Voucher' | 'CM' | 'Product';
export type LegacyCustomerRewardStatus = 'Used' | 'Not Used';

@Entity({ schema: 'public', name: 't_cust_reward' })
export class TypeOrmCustomerRewardEntity {
  @PrimaryColumn({ name: 'cust_reward_id' })
  readonly id: string;

  @Column({ name: 'reward_voucher_id' })
  readonly voucherId: string;

  @Column({ select: false })
  readonly type: LegacyCustomerRewardType;

  @Column({ name: 'cust_id' })
  readonly externalId: string;

  @OneToOne(() => TypeOrmVoucherEntity, (entity) => entity.customerReward)
  readonly voucher: Relation<TypeOrmVoucherEntity>;

  @Column({
    type: 'date',
    transformer: {
      from(value: string): Date {
        return DateTime.fromFormat(value, 'yyyy-MM-dd').toJSDate();
      },
      to(value) {
        // @BEN we are not using this since we dont write to this table
        throw new Error('not implemented');
      },
    },
  })
  readonly expiredDate: Date;

  @Column({ select: false })
  readonly status: LegacyCustomerRewardStatus;
}
