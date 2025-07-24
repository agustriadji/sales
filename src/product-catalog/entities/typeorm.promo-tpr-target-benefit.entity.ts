import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomType } from '@wings-online/app.constants';
import { BenefitType, NumberTransformer } from '@wings-online/common';

import { TypeOrmItemEntity } from '../promotion';
import { TypeOrmPromoTprTargetEntity } from './typeorm.promo-tpr-target.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_target_benefit' })
export class TypeOrmPromoTprTargetBenefitEntity {
  @PrimaryColumn({ name: 'promo_target_id' })
  readonly targetId: string;

  @OneToOne(() => TypeOrmPromoTprTargetEntity, (target) => target.benefit)
  @JoinColumn({ name: 'promo_target_id' })
  readonly target: Relation<TypeOrmPromoTprTargetEntity>;

  @Column({ name: 'benefit_type' })
  readonly type: BenefitType;

  @Column({
    name: 'benefit_value',
    type: 'numeric',
    transformer: new NumberTransformer(),
  })
  readonly value: number;

  @Column()
  readonly discountPercentage: number;

  @Column()
  readonly coinPercentage: number;

  @Column()
  readonly maxQty?: number;

  @Column()
  readonly maxUomType?: UomType;

  @Column({ type: 'uuid' })
  readonly freeItemId: string;

  @Column()
  readonly freeItemQty: number;

  @Column()
  readonly freeItemUomType: UomType;

  readonly freeItem: TypeOrmItemEntity;
}
