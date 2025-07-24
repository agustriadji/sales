import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmPromoCMSCriteriaEntity } from './typeorm.promo-cms-criteria.entity';

@Entity({ schema: 'sales', name: 'promo_cms_redemption' })
export class TypeOrmPromoCMSRedemptionEntity {
  @PrimaryColumn()
  readonly orderNumber: string;

  @PrimaryColumn({ type: 'uuid' })
  readonly promoCriteriaId: string;

  @ManyToOne(() => TypeOrmPromoCMSCriteriaEntity, 'redemptions')
  @JoinColumn({ name: 'promo_criteria_id' })
  readonly promoCriteria: Relation<TypeOrmPromoCMSCriteriaEntity>;

  @Column()
  readonly buyerId: string;

  @Column({ type: 'int' })
  readonly qty: number;
}
