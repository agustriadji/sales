import { Column, Entity, ManyToOne, PrimaryColumn, Relation } from 'typeorm';

import { BuyerType } from '../cart.constants';
import { TypeOrmBuyerEntity } from './typeorm.buyer.entity';

@Entity({ schema: 'sales', name: 'buyer_info' })
export class TypeOrmBuyerInfoEntity {
  @PrimaryColumn({ type: 'uuid', name: 'buyer_id' })
  readonly buyerId: string;

  @ManyToOne(() => TypeOrmBuyerEntity, (buyer) => buyer.infos)
  readonly buyer: Relation<TypeOrmBuyerEntity>;

  @PrimaryColumn()
  readonly type: BuyerType;

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
