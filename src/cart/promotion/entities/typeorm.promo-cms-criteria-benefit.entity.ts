import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomTypeEnum } from '@wings-online/app.constants';
import { BenefitType, NumberTransformer } from '@wings-online/common';

import { TypeOrmPromoCMSCriteriaEntity } from './typeorm.promo-cms-criteria.entity';

@Entity({ schema: 'sales', name: 'promo_cms_criteria_benefit' })
export class TypeOrmPromoCMSCriteriaBenefitEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoCriteriaId: string;

  @OneToOne(() => TypeOrmPromoCMSCriteriaEntity, 'benefit')
  @JoinColumn({ name: 'promo_criteria_id' })
  readonly criteria: Relation<TypeOrmPromoCMSCriteriaEntity>;

  @Column({ type: 'varchar' })
  readonly discountType: BenefitType;

  @Column({ type: 'numeric', transformer: new NumberTransformer() })
  readonly discountValue: number;

  @Column({ nullable: true, type: 'varchar' })
  readonly coinType?: BenefitType;

  @Column({
    nullable: true,
    type: 'numeric',
    transformer: new NumberTransformer(),
  })
  readonly coinValue?: number;

  @Column({ type: 'int', nullable: true })
  readonly maxQty?: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly maxQtyUomType?: UomTypeEnum;

  @Column({ type: 'int', nullable: true, default: 1 })
  readonly scaleQty: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly scaleQtyUomType: UomTypeEnum;
}
