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

import { TypeOrmPromoTprCriteriaEntity } from './typeorm.promo-tpr-criteria.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_criteria_benefit' })
export class TypeOrmPromoTprCriteriaBenefitEntity {
  @PrimaryColumn({ name: 'promo_criteria_id' })
  readonly criteriaId: string;

  @OneToOne(() => TypeOrmPromoTprCriteriaEntity, (criteria) => criteria.benefit)
  @JoinColumn({ name: 'promo_criteria_id' })
  readonly criteria: Relation<TypeOrmPromoTprCriteriaEntity>;

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

  @Column({ name: 'max_uom_type' })
  readonly maxUomType?: UomType;
}
