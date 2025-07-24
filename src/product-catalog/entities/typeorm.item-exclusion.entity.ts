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
export class TypeOrmItemExclusionEntity {
  @PrimaryColumn({ name: 'item_id', type: 'uuid' })
  readonly itemId: string;

  @PrimaryColumn({ select: false })
  readonly key: string;

  @Column({ select: false })
  readonly validFrom: Date;

  @Column({ select: false })
  readonly validTo: Date;

  @ManyToOne(() => TypeOrmItemEntity, 'exclusions')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
