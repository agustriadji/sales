import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
  Unique,
} from 'typeorm';

import {
  TypeOrmBannerEntity,
  TypeOrmSlideEntity,
} from '@wings-online/banner/entities';
import {
  TypeOrmBestSellerEntity,
  TypeOrmCustItemHistoryEntity,
  TypeOrmItemExclusionEntity,
  TypeOrmProductViewEntity,
  TypeOrmPromoTprTargetEntity,
  TypeOrmRecommendationSimilarEntity,
  TypeOrmRecommendationUsEntity,
} from '@wings-online/product-catalog/entities';

import { ProductEntity } from '../product-catalog.constants';
import { TypeOrmPromoCMSCriteriaEntity } from '../promotion';
import { TypeOrmCartItemEntity } from './typeorm.cart-item.entity';
import { TypeOrmItemBarcodeEntity } from './typeorm.item-barcode.entity';
import { TypeOrmItemInfoEntity } from './typeorm.item-info.entity';
import { TypeOrmItemPriceEntity } from './typeorm.item-price.entity';
import { TypeOrmItemSalesConfigEntity } from './typeorm.item-sales-config.entity';
import { TypeOrmItemSalesFactorEntity } from './typeorm.item-sales-factor.entity';
import { TypeOrmItemSalesRetailEntity } from './typeorm.item-sales-retail.entity';
import { TypeOrmItemSalesUomEntity } from './typeorm.item-sales-uom.entity';
import { TypeOrmRecommendationCsEntity } from './typeorm.recommendation-cs.entity';
import { TypeOrmWishlistItemEntity } from './typeorm.wishlist-item.entity';

@Entity({ schema: 'sales', name: 'item' })
@Unique(['externalId', 'entity'])
export class TypeOrmItemEntity {
  @PrimaryColumn({ type: 'uuid' })
  readonly id: string;

  @Column({ name: 'base_uom', nullable: true })
  readonly baseUom: string;

  @Column({ name: 'pack_uom', nullable: true })
  readonly packUom?: string;

  @Column({ name: 'pack_qty', type: 'int', nullable: true })
  readonly packQty?: number;

  @Column({ type: 'boolean' })
  readonly isActive: boolean;

  @Column({ name: 'external_id' })
  readonly externalId: string;

  @Column({ name: 'entity', type: 'text', enum: ProductEntity })
  readonly entity: ProductEntity;

  @Column({ name: 'weight_in_kg', type: 'int' })
  readonly weightInKg: number;

  @OneToMany(() => TypeOrmItemPriceEntity, 'item')
  readonly prices: Relation<TypeOrmItemPriceEntity[]>;

  @OneToMany(() => TypeOrmItemSalesConfigEntity, (config) => config.item)
  readonly salesConfigs: Relation<TypeOrmItemSalesConfigEntity[]>;

  @OneToMany(() => TypeOrmItemSalesFactorEntity, 'item')
  readonly salesFactors: Relation<TypeOrmItemSalesFactorEntity[]>;

  @OneToMany(() => TypeOrmItemSalesRetailEntity, 'item')
  readonly retailConfigs: Relation<TypeOrmItemSalesRetailEntity[]>;

  @OneToMany(() => TypeOrmItemSalesUomEntity, 'item')
  readonly uoms: Relation<TypeOrmItemSalesUomEntity[]>;

  @OneToOne(() => TypeOrmItemInfoEntity, 'item')
  readonly info: Relation<TypeOrmItemInfoEntity>;

  @OneToMany(() => TypeOrmProductViewEntity, 'item')
  readonly views: Relation<TypeOrmProductViewEntity[]>;

  @OneToMany(() => TypeOrmItemExclusionEntity, 'item')
  readonly exclusions: Relation<TypeOrmItemExclusionEntity[]>;

  readonly bestSeller: TypeOrmBestSellerEntity;
  readonly recommendationCs: TypeOrmRecommendationCsEntity;
  readonly recommendationUs: TypeOrmRecommendationUsEntity;
  readonly recommendationSimilar: TypeOrmRecommendationSimilarEntity;
  readonly custItemHistory: TypeOrmCustItemHistoryEntity;

  @OneToOne(() => TypeOrmItemBarcodeEntity, 'item')
  readonly barcode: Relation<TypeOrmItemBarcodeEntity>;

  @OneToMany(() => TypeOrmCartItemEntity, 'item')
  readonly cartItems: Relation<TypeOrmCartItemEntity[]>;

  @OneToMany(() => TypeOrmWishlistItemEntity, 'item')
  readonly wishlistItems: Relation<TypeOrmWishlistItemEntity[]>;

  @OneToMany(() => TypeOrmBannerEntity, (banner) => banner.materialId)
  readonly banners: Relation<TypeOrmBannerEntity[]>;

  @OneToMany(() => TypeOrmSlideEntity, (banner) => banner.materialId)
  readonly slides: Relation<TypeOrmSlideEntity[]>;

  readonly promoCMSCriteria: Relation<TypeOrmPromoCMSCriteriaEntity[]>;

  readonly promoTPRTargets?: Relation<TypeOrmPromoTprTargetEntity[]>;
}
