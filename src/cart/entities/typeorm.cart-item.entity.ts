import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmCartItemPriceEntity } from './typeorm.cart-item-price.entity';
import { TypeOrmCartSimulatedPriceEntity } from './typeorm.cart-simulated-price.entity';
import { TypeOrmCartEntity } from './typeorm.cart.entity';
import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'cart_item' })
export class TypeOrmCartItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  public readonly id: string;

  @Column({ type: 'uuid' })
  public readonly cartId: string;

  @ManyToOne('TypeOrmCartEntity', 'items')
  @JoinColumn({ name: 'cart_id' })
  public readonly cart: Relation<TypeOrmCartEntity>;

  @Column({ type: 'uuid' })
  public readonly itemId: string;

  @ManyToOne('TypeOrmItemEntity', 'cartItems')
  @JoinColumn({ name: 'item_id' })
  public readonly item: Relation<TypeOrmItemEntity>;

  @OneToOne('TypeOrmCartItemPriceEntity', 'cartItem')
  readonly price?: Relation<TypeOrmCartItemPriceEntity>;

  @Column({ type: 'int' })
  public readonly qty: number;

  @Column({ type: 'int' })
  public readonly qtyIntermediate: number;

  @Column({ type: 'int' })
  public readonly qtyPack: number;

  @Column({ type: 'int' })
  public readonly salesFactor: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  readonly createdAt: Date;

  @Column()
  public readonly isBaseSellable: boolean;

  @Column()
  public readonly isPackSellable: boolean;

  @OneToOne('TypeOrmCartSimulatedPriceEntity', 'cartItem')
  readonly simulatedPrice?: Relation<TypeOrmCartSimulatedPriceEntity>;
}
