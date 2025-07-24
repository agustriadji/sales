import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmUserDefaultAddressEntity } from './typeorm.user-default-address.entity';
import { TypeOrmUserInfoEntity } from './typeorm.user-info.entity';

@Entity({ schema: 'sales', name: 'buyer' })
export class TypeOrmUserEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly externalId: string;

  @Column()
  readonly isActive: boolean;

  @OneToMany(() => TypeOrmUserInfoEntity, (info) => info.user)
  readonly infos: Relation<TypeOrmUserInfoEntity[]>;

  @OneToOne(() => TypeOrmUserDefaultAddressEntity, (address) => address.user)
  @JoinColumn({ name: 'external_id' })
  readonly defaultAddress: Relation<TypeOrmUserDefaultAddressEntity>;
}
