import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_barcode' })
export class TypeOrmItemBarcodeEntity {
  @PrimaryColumn({ type: 'uuid', name: 'item_id' })
  readonly itemId: string;

  @Column({ type: 'varchar', name: 'base_barcode' })
  readonly baseBarcode: string;

  @Column({ type: 'varchar', name: 'pack_barcode' })
  readonly packBarcode: string;

  @OneToOne(() => TypeOrmItemEntity, 'barcode')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
