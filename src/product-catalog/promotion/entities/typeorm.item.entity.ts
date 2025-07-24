import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import {
  TypeOrmItemExclusionEntity,
  TypeOrmItemPriceEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmItemSalesRetailEntity,
} from '@wings-online/product-catalog/entities';

import { TypeOrmItemInfoEntity } from './typeorm.item-info.entity';
import { TypeOrmItemSalesUomEntity } from './typeorm.item-sales-uom.entity';

@Entity({ schema: 'sales', name: 'item' })
export class TypeOrmItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ nullable: true })
  readonly baseUom: string;

  @Column({ nullable: true })
  readonly packUom?: string;

  @Column({ nullable: true })
  readonly packQty?: number;

  @OneToOne(() => TypeOrmItemInfoEntity, 'item')
  readonly info: Relation<TypeOrmItemInfoEntity>;

  @OneToMany(() => TypeOrmItemSalesUomEntity, 'item')
  readonly uoms: Relation<TypeOrmItemSalesUomEntity[]>;

  @OneToMany(() => TypeOrmItemPriceEntity, 'item')
  readonly prices: Relation<TypeOrmItemPriceEntity[]>;

  @OneToMany(() => TypeOrmItemSalesConfigEntity, (config) => config.item)
  readonly salesConfigs: Relation<TypeOrmItemSalesConfigEntity[]>;

  @OneToMany(() => TypeOrmItemSalesRetailEntity, 'item')
  readonly retailConfigs: Relation<TypeOrmItemSalesRetailEntity[]>;

  @OneToMany(() => TypeOrmItemExclusionEntity, 'item')
  readonly exclusions: Relation<TypeOrmItemExclusionEntity[]>;
}
