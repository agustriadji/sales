import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomType, UomTypeEnum } from '@wings-online/app.constants';

import { TypeOrmPromoTPRCriteriaBenefitEntity } from './typeorm.promo-tpr-criteria-benefit.entity';
import { TypeOrmPromoTPRTargetEntity } from './typeorm.promo-tpr-target.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_criteria' })
export class TypeOrmPromoTPRCriteriaEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ type: 'uuid' })
  readonly promoTargetId: string;

  @ManyToOne(() => TypeOrmPromoTPRTargetEntity, (target) => target.criteria)
  @JoinColumn({ name: 'promo_target_id' })
  readonly target: Relation<TypeOrmPromoTPRTargetEntity>;

  @Column({ type: 'int' })
  readonly minQty: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly minQtyUomType: UomType;

  @Column({ type: 'int' })
  readonly minPurchase: number;

  @OneToOne(
    () => TypeOrmPromoTPRCriteriaBenefitEntity,
    (benefit) => benefit.criteria,
  )
  readonly benefit: Relation<TypeOrmPromoTPRCriteriaBenefitEntity>;
}
