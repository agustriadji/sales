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
  @PrimaryColumn({ type: 'int' })
  readonly itemId: number;

  @PrimaryColumn()
  readonly key: string;

  @Column()
  readonly validFrom: Date;

  @Column()
  readonly validTo: Date;

  @ManyToOne('TypeOrmItemEntity', 'retailConfigs')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
