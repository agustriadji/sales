import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { UomType } from '@wings-online/app.constants';

import { TypeOrmPromoTprCriteriaBenefitEntity } from './typeorm.promo-tpr-criteria-benefit.entity';
import { TypeOrmPromoTprTargetEntity } from './typeorm.promo-tpr-target.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_criteria' })
export class TypeOrmPromoTprCriteriaEntity {
  @PrimaryColumn()
  readonly id: string;

  @Column({ name: 'promo_target_id' })
  readonly targetId: string;

  @ManyToOne(() => TypeOrmPromoTprTargetEntity, (target) => target.criterias)
  @JoinColumn({ name: 'promo_target_id' })
  readonly target: Relation<TypeOrmPromoTprTargetEntity>;

  @Column()
  readonly minQty: number;

  @Column()
  readonly minQtyUomType?: UomType;

  @Column()
  readonly minPurchase: number;

  @OneToOne(
    () => TypeOrmPromoTprCriteriaBenefitEntity,
    (benefit) => benefit.criteria,
  )
  readonly benefit: Relation<TypeOrmPromoTprCriteriaBenefitEntity>;
}
