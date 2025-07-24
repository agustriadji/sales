import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { ItemType } from '../cart.constants';
import { TypeOrmBrandEntity } from './typeorm.brand.entity';
import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_info' })
export class TypeOrmItemInfoEntity {
  @PrimaryColumn({ type: 'uuid', name: 'item_id' })
  readonly itemId: string;

  @Column()
  readonly type: ItemType;

  @Column({ nullable: true })
  readonly name?: string;

  @Column({ nullable: true })
  readonly description?: string;

  @Column()
  readonly imageUrl: string;

  @Column()
  readonly brandId: number;

  @OneToOne('TypeOrmItemEntity', 'info')
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;

  @ManyToOne(() => TypeOrmBrandEntity, (brand) => brand.itemInfo)
  @JoinColumn({ name: 'brand_id' })
  readonly brand: Relation<TypeOrmBrandEntity>;
}
