import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmBrandNewEntity } from './typeorm.brand-new.entity';
import { TypeOrmItemInfoEntity } from './typeorm.item-info.entity';

@Entity({ schema: 'public', name: 'm_prod_heir3' })
export class TypeOrmBrandEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'prod_heir3' })
  readonly prodHeir: string;

  @Column({ name: 'prod_heir_desc' })
  readonly description: string;

  @Column()
  readonly image: string;

  @Column()
  readonly flagWs: string;

  @OneToOne(() => TypeOrmBrandNewEntity, 'brand')
  readonly brandNew: Relation<TypeOrmBrandNewEntity>;

  @OneToMany(() => TypeOrmItemInfoEntity, (itemInfo) => itemInfo.brand)
  @JoinColumn({ name: 'id' })
  readonly itemInfo: Relation<TypeOrmItemInfoEntity>;
}
