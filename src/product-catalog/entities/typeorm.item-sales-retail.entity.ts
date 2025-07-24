import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_sales_retail' })
export class TypeOrmItemSalesRetailEntity {
  @PrimaryColumn({ name: 'item_id', type: 'uuid' })
  readonly itemId: string;

  @PrimaryColumn()
  readonly key: string;

  @Column({ name: 'valid_from', type: 'timestamptz', select: false })
  readonly validFrom: Date;

  @Column({ name: 'valid_to', type: 'timestamptz', select: false })
  readonly validTo: Date;

  @ManyToOne(() => TypeOrmItemEntity, 'retailConfigs')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
