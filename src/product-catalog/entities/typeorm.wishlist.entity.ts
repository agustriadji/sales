import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

import { TypeOrmWishlistItemEntity } from './typeorm.wishlist-item.entity';

@Entity({ schema: 'sales', name: 'wishlist' })
export class TypeOrmWishlistEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  readonly buyerId: string;

  @Column({ name: 'name', type: 'uuid' })
  readonly name: string;

  @Column()
  readonly isDefault: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  readonly updatedAt: Date;

  @OneToMany('TypeOrmWishlistItemEntity', 'wishlist')
  public readonly items: Relation<TypeOrmWishlistItemEntity[]>;
}
