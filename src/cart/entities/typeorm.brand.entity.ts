import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemInfoEntity } from './typeorm.item-info.entity';

@Entity({ schema: 'public', name: 'm_prod_heir3' })
export class TypeOrmBrandEntity {
  @PrimaryColumn({ type: 'int' })
  readonly id: number;

  @Column({ name: 'prod_heir3' })
  readonly prodHeir: string;

  @Column({ name: 'prod_heir_desc' })
  readonly description: string;

  @OneToMany(() => TypeOrmItemInfoEntity, (itemInfo) => itemInfo.brand)
  @JoinColumn({ name: 'id' })
  readonly itemInfo: Relation<TypeOrmItemInfoEntity[]>;
}
