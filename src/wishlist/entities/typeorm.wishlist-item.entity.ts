import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemEntity } from '@wings-online/product-catalog/entities';

import { TypeOrmWishlistEntity } from './typeorm.wishlist.entity';

@Entity({ schema: 'sales', name: 'wishlist_item' })
export class TypeOrmWishlistItemEntity {
  @PrimaryColumn({ name: 'wishlist_id', type: 'uuid' })
  readonly wishlistId: string;

  @PrimaryColumn({ name: 'item_id', type: 'uuid' })
  readonly itemId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  readonly createdAt: Date;

  @ManyToOne(() => TypeOrmWishlistEntity, 'items')
  @JoinColumn({ name: 'wishlist_id' })
  public readonly wishlist: Relation<TypeOrmWishlistEntity>;

  @ManyToOne(() => TypeOrmItemEntity, 'wishlistItems')
  @JoinColumn({ name: 'item_id' })
  public readonly item: Relation<TypeOrmItemEntity>;
}
