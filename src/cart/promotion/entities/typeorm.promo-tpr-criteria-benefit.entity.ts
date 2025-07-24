import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { BenefitType, NumberTransformer } from '@wings-online/common';

import { TypeOrmPromoTPRCriteriaEntity } from './typeorm.promo-tpr-criteria.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_criteria_benefit' })
export class TypeOrmPromoTPRCriteriaBenefitEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoCriteriaId: string;

  @OneToOne(() => TypeOrmPromoTPRCriteriaEntity, (criteria) => criteria.benefit)
  @JoinColumn({ name: 'promo_criteria_id' })
  readonly criteria: Relation<TypeOrmPromoTPRCriteriaEntity>;

  @Column({ nullable: true, type: 'varchar' })
  readonly benefitType?: BenefitType;

  @Column({ type: 'numeric', transformer: new NumberTransformer() })
  readonly benefitValue?: number;

  @Column({ type: 'int', nullable: true })
  readonly discountPercentage: number;

  @Column({ type: 'int', nullable: true })
  readonly coinPercentage: number;

  @Column({ type: 'int', nullable: true })
  readonly maxQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum, nullable: true })
  readonly maxUomType?: UomType;
}
