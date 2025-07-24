import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmCartEntity } from './typeorm.cart.entity';

@Entity({ schema: 'sales', name: 'cart_tag' })
export class TypeOrmCartTagEntity {
  @PrimaryColumn({ type: 'uuid' })
  public readonly id: string;

  @Column({ type: 'uuid' })
  public readonly cartId: string;

  @ManyToOne('TypeOrmCartEntity', 'items')
  @JoinColumn({ name: 'cart_id' })
  public readonly cart: Relation<TypeOrmCartEntity>;

  @PrimaryColumn()
  public readonly tag: string;

  @Column({ type: 'int' })
  public readonly qty: number;
}
