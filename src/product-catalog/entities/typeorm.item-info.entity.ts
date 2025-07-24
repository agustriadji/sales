import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { ProductType } from '../product-catalog.constants';
import { TypeOrmBrandEntity } from './typeorm.brand.entity';
import { TypeOrmCategoryEntity } from './typeorm.category.entity';
import { TypeOrmItemEntity } from './typeorm.item.entity';

@Entity({ schema: 'sales', name: 'item_info' })
export class TypeOrmItemInfoEntity {
  @PrimaryColumn({ type: 'uuid', name: 'item_id' })
  readonly itemId: string;

  @Column({ name: 'type', type: 'text', enum: ProductType })
  readonly type: ProductType;

  @Column({ type: 'varchar', name: 'name' })
  readonly name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  readonly description?: string;

  @Column({ type: 'varchar', name: 'variant', nullable: true })
  readonly variant?: string;

  @Column({ type: 'varchar', name: 'image_url' })
  readonly imageUrl: string;

  @Column({ type: 'boolean', name: 'is_new' })
  readonly isNew: boolean;

  @Column({ type: 'int', name: 'category_id', nullable: true })
  readonly categoryId?: number;

  @Column({ type: 'int', name: 'brand_id', nullable: true })
  readonly brandId?: number;

  @Column({ type: 'varchar', name: 'pack_size', nullable: true })
  readonly packSize?: string;

  @ManyToOne(() => TypeOrmItemEntity, (item) => item.info)
  @JoinColumn({ name: 'item_id' })
  readonly item: Relation<TypeOrmItemEntity>;

  readonly category: TypeOrmCategoryEntity;

  @ManyToOne(() => TypeOrmBrandEntity, (brand) => brand.itemInfo)
  @JoinColumn({ name: 'brand_id' })
  readonly brand: Relation<TypeOrmBrandEntity>;
}
