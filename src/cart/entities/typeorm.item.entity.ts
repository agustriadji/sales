import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import {
  TypeOrmRecommendationCsEntity,
  TypeOrmRecommendationUsEntity,
} from '@wings-online/product-catalog/entities';

import { TypeOrmPromoCMSCriteriaEntity } from '../promotion';
import { TypeOrmPromoItemEntity } from '../promotion/entities/typeorm.promo-item.entity';
import { TypeOrmCartItemEntity } from './typeorm.cart-item.entity';
import { TypeOrmItemExclusionEntity } from './typeorm.item-exclusion.entity';
import { TypeOrmItemInfoEntity } from './typeorm.item-info.entity';
import { TypeOrmItemPriceEntity } from './typeorm.item-price.entity';
import { TypeOrmItemSalesConfigEntity } from './typeorm.item-sales-config.entity';
import { TypeOrmItemSalesExcludeEntity } from './typeorm.item-sales-exclude.entity';
import { TypeOrmItemSalesFactorEntity } from './typeorm.item-sales-factor.entity';
import { TypeOrmItemSalesRetailEntity } from './typeorm.item-sales-retail.entity';
import { TypeOrmItemSalesUomEntity } from './typeorm.item-sales-uom.entity';

@Entity({ schema: 'sales', name: 'item' })
export class TypeOrmItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column()
  readonly baseUom: string;

  @Column({ nullable: true })
  readonly packUom?: string;

  @Column({ name: 'pack_qty' })
  readonly packQty: number;

  @Column({ type: 'boolean' })
  readonly isActive: boolean;

  @Column()
  readonly entity: string;

  @Column({ name: 'external_id' })
  readonly externalId: string;

  @OneToOne('TypeOrmItemInfoEntity', 'item')
  readonly info: Relation<TypeOrmItemInfoEntity>;

  @OneToMany('TypeOrmItemPriceEntity', 'item')
  readonly prices: Relation<TypeOrmItemPriceEntity[]>;

  @OneToMany('TypeOrmItemSalesFactorEntity', 'item')
  readonly salesFactors: Relation<TypeOrmItemSalesFactorEntity[]>;

  @OneToMany('TypeOrmCartItemEntity', 'item')
  readonly cartItems: Relation<TypeOrmCartItemEntity[]>;

  @OneToMany('TypeOrmPromoItemEntity', 'item')
  readonly promotions: Relation<TypeOrmPromoItemEntity[]>;

  @OneToMany('TypeOrmItemSalesRetailEntity', 'item')
  readonly retailConfigs: Relation<TypeOrmItemSalesRetailEntity[]>;

  @OneToMany('TypeOrmItemSalesExcludeEntity', 'item')
  readonly excludeConfigs: Relation<TypeOrmItemSalesExcludeEntity[]>;

  @OneToMany(() => TypeOrmItemSalesConfigEntity, (configs) => configs.item)
  readonly salesConfigs: Relation<TypeOrmItemSalesConfigEntity[]>;

  @OneToMany(() => TypeOrmItemSalesUomEntity, (uoms) => uoms.item)
  readonly uoms: Relation<TypeOrmItemSalesUomEntity[]>;

  @OneToMany(() => TypeOrmItemExclusionEntity, 'item')
  readonly exclusions: Relation<TypeOrmItemExclusionEntity[]>;

  readonly recommendationCs: TypeOrmRecommendationCsEntity;
  readonly recommendationUs: TypeOrmRecommendationUsEntity;

  readonly promoCMSCriteria: Relation<TypeOrmPromoCMSCriteriaEntity[]>;
}
