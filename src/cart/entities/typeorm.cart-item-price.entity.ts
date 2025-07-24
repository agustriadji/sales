import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmCartItemEntity } from './typeorm.cart-item.entity';

@Entity({ schema: 'sales', name: 'cart_item_price' })
export class TypeOrmCartItemPriceEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly cartItemId: string;

  @OneToOne('TypeOrmCartItemEntity', 'price')
  @JoinColumn({ name: 'cart_item_id' })
  readonly cartItem: Relation<TypeOrmCartItemEntity>;

  @Column({
    type: 'int',
  })
  readonly price: number;
}
