import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmBrandEntity } from './typeorm.brand.entity';
import { TypeOrmCategoryBrandEntity } from './typeorm.category-brand.entity';

@Entity({ schema: 'public', name: 'm_prod_heir_new' })
export class TypeOrmBrandNewEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'prod_heir' })
  readonly prodHeir: string;

  @Column({ name: 'prod_heir_desc' })
  readonly description: string;

  @Column()
  readonly image: string;

  @Column()
  readonly flagWs: string;

  @OneToOne(() => TypeOrmCategoryBrandEntity, (category) => category.brand)
  readonly brandCategory: Relation<TypeOrmCategoryBrandEntity>;

  @OneToOne(() => TypeOrmBrandEntity, 'brandNew')
  @JoinColumn({ name: 'prod_heir', referencedColumnName: 'prodHeir' })
  readonly brand: Relation<TypeOrmBrandEntity>;
}
