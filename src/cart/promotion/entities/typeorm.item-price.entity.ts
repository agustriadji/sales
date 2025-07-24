import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
  Unique,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_price' })
@Unique(['itemId', 'priceKey', 'validFrom'])
export class TypeOrmItemPriceEntity {
  @PrimaryColumn({ name: 'item_id', type: 'uuid' })
  readonly itemId: string;

  @PrimaryColumn({ name: 'price_key' })
  readonly priceKey: string;

  @PrimaryColumn({ type: 'timestamptz' })
  readonly validFrom: Date;

  @Column({ type: 'timestamptz', select: false })
  readonly validTo: Date;

  @ManyToOne(() => TypeOrmItemEntity, 'prices')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
