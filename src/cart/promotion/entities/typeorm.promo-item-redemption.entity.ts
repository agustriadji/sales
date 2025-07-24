import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmPromoItemEntity } from './typeorm.promo-item.entity';

@Entity({ schema: 'sales', name: 'promo_item_redemption' })
export class TypeOrmPromoItemRedemptionEntity {
  @PrimaryColumn()
  readonly orderNumber: string;

  @PrimaryColumn({ type: 'uuid' })
  readonly promoItemId: string;

  @ManyToOne('TypeOrmPromoItemEntity', 'redemptions')
  @JoinColumn({ name: 'promo_item_id' })
  readonly promoItem: Relation<TypeOrmPromoItemEntity>;

  @Column()
  readonly buyerId: string;

  @Column({ type: 'int' })
  readonly qty: number;
}
