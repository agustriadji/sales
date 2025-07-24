import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmVoucherTargetEntity } from './typeorm.voucher-target.entity';

@Entity({ schema: 'public', name: 'm_reward_voucher_mat' })
export class TypeOrmVoucherMaterialEntity {
  @PrimaryColumn({ type: 'int' })
  readonly rewardVoucherMatId: number;

  @Column()
  readonly matGrp2?: string;

  @Column()
  readonly materialId?: string;

  @OneToOne(() => TypeOrmVoucherTargetEntity, (target) => target.material)
  @JoinColumn({
    name: 'reward_voucher_mat_id',
    referencedColumnName: 'rewardVoucherMatId',
  })
  readonly target: Relation<TypeOrmVoucherTargetEntity>;
}
