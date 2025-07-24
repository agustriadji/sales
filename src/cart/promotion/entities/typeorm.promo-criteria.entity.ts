import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmPromoCriteriaBenefitEntity } from './typeorm.promo-criteria-benefit.entity';
import { TypeOrmPromoItemEntity } from './typeorm.promo-item.entity';

@Entity({ schema: 'sales', name: 'promo_criteria' })
export class TypeOrmPromoCriteriaEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ type: 'uuid' })
  readonly promoItemId: string;

  @ManyToOne('TypeOrmPromoItemEntity', 'criteria')
  @JoinColumn({ name: 'promo_item_id' })
  readonly promoItem: Relation<TypeOrmPromoItemEntity>;

  @Column()
  readonly tag: string;

  @Column({ type: 'int' })
  readonly minQty: number;

  @Column({ type: 'int', nullable: true })
  readonly maxQty?: number;

  @OneToOne('TypeOrmPromoCriteriaBenefitEntity', 'criteria')
  readonly benefit: Relation<TypeOrmPromoCriteriaBenefitEntity>;
}
