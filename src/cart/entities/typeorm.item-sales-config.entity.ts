import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_sales_config' })
export class TypeOrmItemSalesConfigEntity {
  @PrimaryColumn({ type: 'int' })
  readonly itemId: number;

  @ManyToOne(() => TypeOrmItemEntity, (item) => item.salesConfigs)
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;

  @PrimaryColumn()
  readonly key: string;

  @Column('text', { array: true })
  readonly tags: string[];
}
