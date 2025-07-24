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

import { UomTypeEnum } from '../promotion.constants';
import { TypeOrmPromoCMSCriteriaBenefitEntity } from './typeorm.promo-cms-criteria-benefit.entity';
import { TypeOrmPromoCmsRedemptionEntity } from './typeorm.promo-cms-redemption.entity';
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

  @Column({ type: 'int' })
  readonly sequence: number;

  @OneToOne(() => TypeOrmPromoCMSCriteriaBenefitEntity, 'criteria')
  readonly benefit: Relation<TypeOrmPromoCMSCriteriaBenefitEntity>;

  @OneToMany(() => TypeOrmPromoCmsRedemptionEntity, 'promoCriteria')
  readonly redemptions: Relation<TypeOrmPromoCmsRedemptionEntity[]>;
}
