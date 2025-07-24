import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_sales_exclude' })
export class TypeOrmItemSalesExcludeEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly itemId: string;

  @PrimaryColumn()
  readonly key: string;

  @Column()
  readonly validFrom: Date;

  @Column()
  readonly validTo: Date;

  @ManyToOne('TypeOrmItemEntity', 'excludeConfigs')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
