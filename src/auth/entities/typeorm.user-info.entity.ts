import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { Division } from '@wings-corporation/core';

import { TypeOrmUserEntity } from './typeorm.user.entity';

@Entity({ schema: 'sales', name: 'buyer_info' })
export class TypeOrmUserInfoEntity {
  @PrimaryColumn({ type: 'uuid', name: 'buyer_id', select: false })
  readonly userId: string;

  @ManyToOne(() => TypeOrmUserEntity, (user) => user.infos)
  @JoinColumn({ name: 'buyer_id' })
  readonly user: Relation<TypeOrmUserEntity>;

  @PrimaryColumn()
  readonly type: Division;

  @Column()
  readonly group: string;

  @Column()
  readonly salesOrg: string;

  @Column()
  readonly distChannel: string;

  @Column()
  readonly salesOffice: string;

  @Column()
  readonly salesGroup: string;

  @Column({ name: 'cust_hier' })
  readonly customerHier: string;

  @Column()
  readonly priceListType: string;

  @Column()
  readonly term?: string;

  @Column()
  readonly payerId?: string;

  @Column()
  readonly salesCode?: string;
}
