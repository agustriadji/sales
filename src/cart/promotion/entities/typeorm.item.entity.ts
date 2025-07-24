import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';

import { TypeOrmItemExclusionEntity } from './typeorm.item-exclusion.entity';
import { TypeOrmItemInfoEntity } from './typeorm.item-info.entity';
import { TypeOrmItemPriceEntity } from './typeorm.item-price.entity';
import { TypeOrmItemSalesConfigEntity } from './typeorm.item-sales-config.entity';
import { TypeOrmItemSalesRetailEntity } from './typeorm.item-sales-retail.entity';
import { TypeOrmItemSalesUomEntity } from './typeorm.item-sales-uom.entity';
import { TypeOrmPromoTPRTargetBenefitEntity } from './typeorm.promo-tpr-target-benefit.entity';

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

  @Column()
  readonly isActive: boolean;

  @Column()
  readonly entity: string;

  @Column()
  readonly externalId: string;

  @OneToOne(() => TypeOrmItemInfoEntity, (info) => info.item)
  readonly info: Relation<TypeOrmItemInfoEntity>;

  @OneToMany(() => TypeOrmItemSalesUomEntity, (uom) => uom.item)
  readonly uoms: Relation<TypeOrmItemSalesUomEntity[]>;

  @OneToMany(() => TypeOrmItemPriceEntity, (price) => price.item)
  readonly prices: Relation<TypeOrmItemPriceEntity[]>;

  @OneToMany(() => TypeOrmItemSalesConfigEntity, (config) => config.item)
  readonly salesConfigs: Relation<TypeOrmItemSalesConfigEntity[]>;

  @OneToMany(() => TypeOrmItemSalesRetailEntity, (retail) => retail.item)
  readonly retailConfigs: Relation<TypeOrmItemSalesRetailEntity[]>;

  @OneToMany(() => TypeOrmItemExclusionEntity, (exclusion) => exclusion.item)
  readonly exclusions: Relation<TypeOrmItemExclusionEntity[]>;

  @OneToMany(
    () => TypeOrmPromoTPRTargetBenefitEntity,
    (promo) => promo.freeItem,
  )
  readonly freeItems: Relation<TypeOrmPromoTPRTargetBenefitEntity[]>;
}
