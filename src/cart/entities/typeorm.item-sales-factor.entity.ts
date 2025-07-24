import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_sales_factor' })
export class TypeOrmItemSalesFactorEntity {
  @PrimaryColumn({ type: 'int' })
  readonly itemId: number;

  @ManyToOne('TypeOrmItemEntity', 'salesFactors')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;

  @PrimaryColumn()
  readonly key: string;

  @Column({ type: 'timestamptz', select: false })
  readonly validFrom: Date;

  @Column({ type: 'timestamptz', select: false })
  readonly validTo: Date;

  @Column({ name: 'level' })
  readonly tier: number;

  @Column({ type: 'int' })
  readonly factor: number;
}
