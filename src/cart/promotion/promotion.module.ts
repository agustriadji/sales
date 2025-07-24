import { forwardRef, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartModule } from '../cart.module';
import {
  TypeOrmItemEntity,
  TypeOrmItemExclusionEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemPriceEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmItemSalesRetailEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmPromoCMSCriteriaBenefitEntity,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoCMSEntity,
  TypeOrmPromoCMSRedemptionEntity,
  TypeOrmPromoCMSTargetEntity,
  TypeOrmPromoCriteriaBenefitEntity,
  TypeOrmPromoCriteriaEntity,
  TypeOrmPromoEntity,
  TypeOrmPromoItemBenefitEntity,
  TypeOrmPromoItemEntity,
  TypeOrmPromoItemRedemptionEntity,
  TypeOrmPromoLoyaltyEntity,
  TypeOrmPromoLoyaltyTargetEntity,
  TypeOrmPromoTargetEntity,
  TypeOrmPromoTPRCriteriaBenefitEntity,
  TypeOrmPromoTPRCriteriaEntity,
  TypeOrmPromoTPRDestCodeEntity,
  TypeOrmPromoTPREntity,
  TypeOrmPromoTPRPriorityEntity,
  TypeOrmPromoTPRTagCriteriaEntity,
  TypeOrmPromoTPRTargetBenefitEntity,
  TypeOrmPromoTPRTargetEntity,
} from './entities';
import { TypeOrmDestCodeEntity } from './entities/typeorm.destination-code.entity';
import { PROMO_READ_REPOSITORY } from './promotion.constants';
import { TypeOrmPromoReadRepository } from './repositories';

const Entities = [
  TypeOrmPromoEntity,
  TypeOrmPromoItemEntity,
  TypeOrmPromoItemBenefitEntity,
  TypeOrmPromoCriteriaEntity,
  TypeOrmPromoCriteriaBenefitEntity,
  TypeOrmPromoTargetEntity,
  TypeOrmPromoLoyaltyEntity,
  TypeOrmPromoLoyaltyTargetEntity,
  TypeOrmPromoItemRedemptionEntity,
  TypeOrmPromoTPREntity,
  TypeOrmPromoTPRTargetEntity,
  TypeOrmPromoTPRTargetBenefitEntity,
  TypeOrmPromoTPRCriteriaEntity,
  TypeOrmPromoTPRCriteriaBenefitEntity,
  TypeOrmPromoTPRTagCriteriaEntity,
  TypeOrmPromoTPRDestCodeEntity,
  TypeOrmPromoTPRPriorityEntity,
  TypeOrmDestCodeEntity,
  TypeOrmPromoCMSCriteriaBenefitEntity,
  TypeOrmPromoCMSCriteriaEntity,
  TypeOrmPromoCMSTargetEntity,
  TypeOrmPromoCMSEntity,
  TypeOrmPromoCMSRedemptionEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmItemPriceEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmItemSalesRetailEntity,
  TypeOrmItemExclusionEntity,
];

const Repositories: Provider<any>[] = [
  {
    provide: PROMO_READ_REPOSITORY,
    useClass: TypeOrmPromoReadRepository,
  },
];

const providers = [...Repositories];

@Module({
  imports: [forwardRef(() => CartModule), TypeOrmModule.forFeature(Entities)],
  providers,
  exports: providers,
})
export class PromotionModule {}
