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

import { TypeOrmPromoItemEntity } from './typeorm.promo-item.entity';

@Entity({ schema: 'sales', name: 'promo_item_benefit' })
export class TypeOrmPromoItemBenefitEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly promoItemId: string;

  @OneToOne('TypeOrmPromoItemEntity', 'benefit')
  @JoinColumn({ name: 'promo_item_id' })
  readonly promoItem: Relation<TypeOrmPromoItemEntity>;

  @Column({ nullable: true, type: 'varchar' })
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
