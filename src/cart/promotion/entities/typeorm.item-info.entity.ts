import { TypeOrmItemEntity } from '.';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { ItemType } from '@wings-online/cart/cart.constants';

@Entity({ schema: 'sales', name: 'item_info' })
export class TypeOrmItemInfoEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly itemId: string;

  @Column({ select: false })
  readonly type: ItemType;

  @Column()
  readonly name: string;

  @Column()
  readonly imageUrl: string;

  @ManyToOne(() => TypeOrmItemEntity, (item) => item.info)
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;
}
