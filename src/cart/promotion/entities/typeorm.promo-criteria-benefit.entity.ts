import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { CoinType, DiscountType } from '@wings-online/app.constants';
import { NumberTransformer } from '@wings-online/common';

import { TypeOrmPromoCriteriaEntity } from './typeorm.promo-criteria.entity';

@Entity({ schema: 'sales', name: 'promo_criteria_benefit' })
export class TypeOrmPromoCriteriaBenefitEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoCriteriaId: string;

  @OneToOne('TypeOrmPromoCriteriaEntity', 'benefit')
  @JoinColumn({ name: 'promo_criteria_id' })
  readonly criteria: Relation<TypeOrmPromoCriteriaEntity>;

  @Column({ type: 'varchar' })
  readonly discountType?: DiscountType;

  @Column({ type: 'numeric', transformer: new NumberTransformer() })
  readonly discountValue?: number;

  @Column({ nullable: true, type: 'varchar' })
  readonly coinType?: CoinType;

  @Column({ type: 'numeric', transformer: new NumberTransformer() })
  readonly coinValue?: number;

  @Column({ type: 'int', nullable: true })
  readonly maxQty?: number;
}
