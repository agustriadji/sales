import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { PromoTPRType, UomType } from '@wings-online/app.constants';

import { TypeOrmPromoTPRCriteriaEntity } from './typeorm.promo-tpr-criteria.entity';
import { TypeOrmPromoTPRTargetBenefitEntity } from './typeorm.promo-tpr-target-benefit.entity';
import { TypeOrmPromoTPREntity } from './typeorm.promo-tpr.entity';

@Entity({ schema: 'sales', name: 'promo_tpr_target' })
export class TypeOrmPromoTPRTargetEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly promoId: string;

  @Column()
  readonly itemId: string;

  @Column()
  readonly priority: number;

  @Column()
  readonly tag: string;

  @Column({ type: 'varchar' })
  readonly type: PromoTPRType;

  @Column({ select: false })
  readonly salesOrg: string;

  @Column({ select: false })
  readonly distChannel: string;

  @Column({ select: false })
  readonly salesOffice: string;

  @Column({ select: false })
  readonly salesGroup: string;

  @Column({ select: false })
  readonly group: string;

  @Column({ select: false })
  readonly buyerExternalId: string;

  @Column({ type: 'timestamptz', select: false })
  readonly periodFrom: Date;

  @Column({ type: 'timestamptz', select: false })
  readonly periodTo: Date;

  @Column({ type: 'int', nullable: true, default: 1 })
  readonly scaleQty: number;

  @Column({ type: 'varchar', nullable: true })
  readonly scaleUomType: UomType;

  @Column({ select: false })
  readonly externalId: string;

  @ManyToOne(() => TypeOrmPromoTPREntity, (promo) => promo.targets)
  @JoinColumn({ name: 'promo_id' })
  readonly promo: Relation<TypeOrmPromoTPREntity>;

  @OneToOne(
    () => TypeOrmPromoTPRTargetBenefitEntity,
    (benefit) => benefit.target,
  )
  readonly benefit: Relation<TypeOrmPromoTPRTargetBenefitEntity>;

  @OneToMany(() => TypeOrmPromoTPRCriteriaEntity, (criteria) => criteria.target)
  readonly criteria: Relation<TypeOrmPromoTPRCriteriaEntity[]>;
}
