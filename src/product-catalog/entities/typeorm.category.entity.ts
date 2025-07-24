import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmCategoryBrandEntity } from './typeorm.category-brand.entity';
import { TypeOrmCategoryInfoEntity } from './typeorm.category-info.entity';

@Entity({ schema: 'sales', name: 'category' })
export class TypeOrmCategoryEntity {
  @PrimaryColumn({ type: 'int', name: 'category_id' })
  readonly id: number;

  @OneToOne(() => TypeOrmCategoryInfoEntity, (info) => info.category)
  @JoinColumn({ name: 'category_id' })
  readonly info: Relation<TypeOrmCategoryInfoEntity>;

  @OneToMany(() => TypeOrmCategoryBrandEntity, (brands) => brands.category)
  readonly categoryBrands: Relation<TypeOrmCategoryBrandEntity[]>;

  @Column()
  readonly type: string;
}
