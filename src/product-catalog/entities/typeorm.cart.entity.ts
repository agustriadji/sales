import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';

import { TypeOrmCartItemEntity } from './typeorm.cart-item.entity';
import { TypeOrmCartTagEntity } from './typeorm.cart-tag.entity';

@Entity({ schema: 'sales', name: 'cart' })
export class TypeOrmCartEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ type: 'uuid' })
  readonly buyerId: string;

  @OneToMany(() => TypeOrmCartItemEntity, (items) => items.cart)
  readonly items: Relation<TypeOrmCartItemEntity[]>;

  @OneToMany(() => TypeOrmCartTagEntity, (tags) => tags.cart)
  readonly tags: Relation<TypeOrmCartTagEntity[]>;
}
