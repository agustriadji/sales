import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

import { TypeOrmBrandNewEntity } from './typeorm.brand-new.entity';
import { TypeOrmCategoryInfoEntity } from './typeorm.category-info.entity';
import { TypeOrmCategoryEntity } from './typeorm.category.entity';

@Entity({ schema: 'public', name: 'm_mapping_category_new' })
export class TypeOrmCategoryBrandEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @OneToOne(() => TypeOrmBrandNewEntity, (category) => category.brandCategory)
  @JoinColumn({ name: 'prod_heir3', referencedColumnName: 'prodHeir' })
  readonly brand: Relation<TypeOrmBrandNewEntity>;

  @Column({ name: 'prod_heir3' })
  readonly name: string;

  @ManyToOne(() => TypeOrmCategoryEntity, (category) => category.categoryBrands)
  @JoinColumn({ name: 'm_category_new_id' })
  readonly category: Relation<TypeOrmCategoryEntity>;

  @ManyToOne(
    () => TypeOrmCategoryInfoEntity,
    (category) => category.categoryBrands,
  )
  @JoinColumn({ name: 'm_category_new_id' })
  readonly categoryInfo: Relation<TypeOrmCategoryInfoEntity>;

  @Column({ name: 'm_category_new_id' })
  readonly categoryId: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  readonly createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  readonly updatedDate: Date;
}
