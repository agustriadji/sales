import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from '@wings-online/cart/entities';

import { TypeOrmRewardVoucherCustomerEntity } from './typeorm.reward-voucher-customer.entity';

@Entity({ schema: 'public', name: 'm_reward_voucher_mat' })
export class TypeOrmRewardVoucherMaterialEntity {
  @PrimaryColumn({ type: 'int' })
  readonly rewardVoucherMatId: number;

  @Column()
  readonly matGrp2?: string;

  @Column()
  readonly materialId?: string;

  @Column()
  readonly isExcludedProduct: boolean;

  @OneToOne('TypeOrmRewardVoucherCustomerEntity', 'material')
  @JoinColumn({
    name: 'reward_voucher_mat_id',
    referencedColumnName: 'rewardVoucherMatId',
  })
  readonly customer: Relation<TypeOrmRewardVoucherCustomerEntity>;

  item?: Relation<TypeOrmItemEntity>;
}
