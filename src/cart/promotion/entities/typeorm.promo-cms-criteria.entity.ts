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

import { UomTypeEnum } from '@wings-online/app.constants';

import { TypeOrmPromoCMSCriteriaBenefitEntity } from './typeorm.promo-cms-criteria-benefit.entity';
import { TypeOrmPromoCMSRedemptionEntity } from './typeorm.promo-cms-redemption.entity';
import { TypeOrmPromoCMSEntity } from './typeorm.promo-cms.entity';

@Entity({ schema: 'sales', name: 'promo_cms_criteria' })
export class TypeOrmPromoCMSCriteriaEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @ManyToOne(() => TypeOrmPromoCMSEntity, 'criteria')
  @JoinColumn({ name: 'promo_id' })
  readonly promo: Relation<TypeOrmPromoCMSEntity>;

  @Column({ type: 'uuid' })
  readonly promoId: string;

  @Column({ type: 'varchar' })
  readonly itemId: string;

  @Column()
  readonly tag: string;

  @Column({ type: 'int' })
  readonly minQty: number;

  @Column({ type: 'enum', enum: UomTypeEnum })
  readonly minQtyUomType: UomTypeEnum;

  @OneToOne(() => TypeOrmPromoCMSCriteriaBenefitEntity, 'criteria')
  readonly benefit: Relation<TypeOrmPromoCMSCriteriaBenefitEntity>;

  @OneToMany(() => TypeOrmPromoCMSRedemptionEntity, 'promoCriteria')
  readonly redemptions: Relation<TypeOrmPromoCMSRedemptionEntity[]>;
}
