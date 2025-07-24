import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { Division } from '@wings-corporation/core';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_info' })
export class TypeOrmItemInfoEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly itemId: string;

  @Column()
  readonly name: string;

  @Column({ select: false })
  readonly type: Division;

  @ManyToOne(() => TypeOrmItemEntity, (item) => item.info)
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
