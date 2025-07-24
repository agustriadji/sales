import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmCartEntity } from './typeorm.cart.entity';
import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'cart_item' })
export class TypeOrmCartItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  public readonly id: string;

  @Column({ name: 'item_id', type: 'uuid' })
  public readonly itemId: string;

  @Column({ type: 'uuid' })
  public readonly cartId: string;

  @ManyToOne(() => TypeOrmItemEntity, 'cartItems')
  @JoinColumn({ name: 'item_id' })
  public readonly item: Relation<TypeOrmItemEntity>;

  @Column({ type: 'int' })
  public readonly qty: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  readonly createdAt: Date;

  @ManyToOne(() => TypeOrmCartEntity, 'items')
  @JoinColumn({ name: 'cart_id' })
  public readonly cart: Relation<TypeOrmCartEntity>;
}
