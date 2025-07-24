import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';

import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'buyer_last_seen_item' })
export class TypeOrmProductViewEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ name: 'buyer_id', type: 'uuid', select: false })
  readonly buyerId: string;

  @Column({ name: 'item_id', type: 'uuid' })
  readonly itemId: string;

  @ManyToOne(() => TypeOrmItemEntity, 'item')
  @JoinColumn({ name: 'item_id' })
  readonly item: TypeOrmItemEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;
}
