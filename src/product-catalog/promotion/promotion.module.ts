import { forwardRef, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartModule } from '@wings-online/cart';

import { ProductCatalogModule } from '../product-catalog.module';
import {
  TypeOrmItemEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmPromoCMSCriteriaBenefitEntity,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoCMSEntity,
  TypeOrmPromoCmsRedemptionEntity,
  TypeOrmPromoCMSTargetEntity,
} from './entities';
import {
  PROMO_READ_REPOSITORY,
  PROMOTION_SERVICE,
} from './promotion.constants';
import { TypeOrmPromoReadRepository } from './repositories';
import { PromotionService } from './services';

const Entities = [
  TypeOrmPromoCMSEntity,
  TypeOrmPromoCMSTargetEntity,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoCMSCriteriaBenefitEntity,
  TypeOrmPromoCmsRedemptionEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemEntity,
  TypeOrmItemSalesUomEntity,
];

const Repositories: Provider<any>[] = [
  {
    provide: PROMO_READ_REPOSITORY,
    useClass: TypeOrmPromoReadRepository,
  },
];

const Services = [
  {
    provide: PROMOTION_SERVICE,
    useClass: PromotionService,
  },
];

const providers = [...Repositories, ...Services];

@Module({
  imports: [
    forwardRef(() => CartModule),
    TypeOrmModule.forFeature(Entities),
    forwardRef(() => ProductCatalogModule),
  ],
  providers,
  exports: providers,
})
export class PromotionModule {}
