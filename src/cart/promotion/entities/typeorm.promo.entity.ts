import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';

import { ItemPromoType, PromoPriority } from '@wings-online/cart/promotion';

import { TypeOrmPromoItemEntity } from './typeorm.promo-item.entity';

@Entity({ schema: 'sales', name: 'promo' })
export class TypeOrmPromoEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ type: 'varchar' })
  readonly type: ItemPromoType;

  @Column()
  readonly externalType: string;

  @Column({ type: 'int' })
  readonly priority: PromoPriority;

  @Column()
  readonly code: string;

  @OneToMany('TypeOrmPromoItemEntity', 'promo')
  readonly items: Relation<TypeOrmPromoItemEntity[]>;
}
