import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

import { TypeOrmCategoryBrandEntity } from './typeorm.category-brand.entity';
import { TypeOrmCategoryParentEntity } from './typeorm.category-parent.entity';
import { TypeOrmCategoryEntity } from './typeorm.category.entity';

@Entity({ schema: 'public', name: 'm_category_new' })
export class TypeOrmCategoryInfoEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column()
  readonly name: string;

  @Column()
  readonly image: string;

  @Column()
  readonly icon: string;

  @Column()
  readonly isDelete: boolean;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  readonly createdDate: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  readonly updatedDate: Date;

  readonly parent?: Relation<TypeOrmCategoryParentEntity>;

  @OneToMany(() => TypeOrmCategoryBrandEntity, (brands) => brands.categoryInfo)
  readonly categoryBrands: Relation<TypeOrmCategoryBrandEntity[]>;

  @OneToOne(() => TypeOrmCategoryEntity, (category) => category.info)
  readonly category: Relation<TypeOrmCategoryEntity>;
}
