import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_sales_uom' })
export class TypeOrmItemSalesUomEntity {
  @PrimaryColumn({ name: 'item_id', type: 'uuid' })
  readonly itemId: string;

  @PrimaryColumn({ name: 'sls_office', type: 'varchar' })
  readonly slsOffice: string;

  @Column({ name: 'level', type: 'int' })
  readonly tier: number;

  @Column({ name: 'uom', type: 'varchar' })
  readonly uom: string;

  @Column({ name: 'pack_qty', type: 'int' })
  readonly packQty: number;

  @ManyToOne(() => TypeOrmItemEntity, 'uoms')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
