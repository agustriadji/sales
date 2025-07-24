import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmUnitOfWorkModule } from '@wings-corporation/nest-typeorm-uow';
import {
  BUYER_READ_REPOSITORY,
  BUYER_WRITE_REPOSITORY,
  CART_READ_REPOSITORY,
  CART_SERVICE,
  CART_VOUCHER_WRITE_REPOSITORY,
  CART_WRITE_REPOSITORY,
  CHECKOUT_WRITE_REPOSITORY,
  CONFIG_READ_REPOSITORY,
  EVENT_WRITE_REPOSITORY,
  ITEM_SALES_UOM_READ_REPOSITORY,
  PROMO_CMS_REDEMPTION_WRITE_REPOSITORY,
  SALES_ITEM_WRITE_REPOSITORY,
} from '@wings-online/app.constants';
import {
  PromotionModule,
  TypeOrmPromoCmsRedemptionWriteRepository,
} from '@wings-online/cart/promotion';
import {
  TypeOrmBuyerWriteRepository,
  TypeOrmCartReadRepository,
  TypeOrmCartWriteRepository,
  TypeOrmCheckoutWriteRepository,
  TypeOrmConfigReadRepository,
  TypeOrmEventWriteRepository,
  TypeormItemSalesUomReadRepository,
  TypeOrmSalesItemWriteRepository,
} from '@wings-online/cart/repositories';
import { VoucherModule } from '@wings-online/cart/voucher';
import {
  TypeOrmWishlistEntity,
  TypeOrmWishlistItemEntity,
} from '@wings-online/wishlist/entities';

import { CommandControllers, CommandHandlers } from './commands';
import { Factories } from './domains';
import {
  TypeOrmBmasLoanEntity,
  TypeOrmBrandEntity,
  TypeOrmBuyerEntity,
  TypeOrmBuyerInfoEntity,
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmCartItemPriceEntity,
  TypeOrmCartSimulatedPriceEntity,
  TypeOrmCartTagEntity,
  TypeOrmCartVoucherEntity,
  TypeOrmConfigEntity,
  TypeOrmDeliveryAddressEntity,
  TypeOrmEventEntity,
  TypeOrmFreezerEntity,
  TypeOrmGeneralConfigEntity,
  TypeOrmItemEntity,
  TypeOrmItemExclusionEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemPriceEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmItemSalesFactorEntity,
  TypeOrmItemSalesRetailEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmJqkPointEntity,
  TypeOrmJqkPointRateEntity,
  TypeOrmJqkPointTargetEntity,
  TypeOrmParameterEntity,
} from './entities';
import { TypeOrmDefaultDeliveryAddressEntity } from './entities/typeorm.default-delivery-address.entity';
import { TypeOrmItemSalesExcludeEntity } from './entities/typeorm.item-sales-exclude.entity';
import { QueryControllers, QueryHandlers } from './queries';
import { TypeOrmBuyerReadRepository } from './repositories/typeorm.buyer.read-repository';
import { CartService } from './services';
import { Subscribers } from './subscribers';

const Entities = [
  TypeOrmBuyerEntity,
  TypeOrmBuyerInfoEntity,
  TypeOrmDeliveryAddressEntity,
  TypeOrmBrandEntity,
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmCartItemPriceEntity,
  TypeOrmCartTagEntity,
  TypeOrmCartVoucherEntity,
  TypeOrmItemEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemPriceEntity,
  TypeOrmItemSalesFactorEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmDefaultDeliveryAddressEntity,
  TypeOrmDeliveryAddressEntity,
  TypeOrmEventEntity,
  TypeOrmConfigEntity,
  TypeOrmItemSalesRetailEntity,
  TypeOrmItemSalesExcludeEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmJqkPointRateEntity,
  TypeOrmJqkPointEntity,
  TypeOrmJqkPointTargetEntity,
  TypeOrmWishlistEntity,
  TypeOrmWishlistItemEntity,
  TypeOrmBmasLoanEntity,
  TypeOrmFreezerEntity,
  TypeOrmParameterEntity,
  TypeOrmGeneralConfigEntity,
  TypeOrmCartSimulatedPriceEntity,
  TypeOrmItemExclusionEntity,
];

const Repositories: Provider<any>[] = [
  {
    provide: BUYER_WRITE_REPOSITORY,
    useClass: TypeOrmBuyerWriteRepository,
  },
  {
    provide: CART_READ_REPOSITORY,
    useClass: TypeOrmCartReadRepository,
  },
  {
    provide: CART_WRITE_REPOSITORY,
    useClass: TypeOrmCartWriteRepository,
  },
  {
    provide: CONFIG_READ_REPOSITORY,
    useClass: TypeOrmConfigReadRepository,
  },
  {
    provide: CART_VOUCHER_WRITE_REPOSITORY,
    useClass: TypeOrmCheckoutWriteRepository,
  },
  {
    provide: CHECKOUT_WRITE_REPOSITORY,
    useClass: TypeOrmCheckoutWriteRepository,
  },
  {
    provide: EVENT_WRITE_REPOSITORY,
    useClass: TypeOrmEventWriteRepository,
  },
  {
    provide: PROMO_CMS_REDEMPTION_WRITE_REPOSITORY,
    useClass: TypeOrmPromoCmsRedemptionWriteRepository,
  },
  {
    provide: SALES_ITEM_WRITE_REPOSITORY,
    useClass: TypeOrmSalesItemWriteRepository,
  },
  {
    provide: BUYER_READ_REPOSITORY,
    useClass: TypeOrmBuyerReadRepository,
  },
  {
    provide: ITEM_SALES_UOM_READ_REPOSITORY,
    useClass: TypeormItemSalesUomReadRepository,
  },
];

const Services = [
  {
    provide: CART_SERVICE,
    useClass: CartService,
  },
];

const providers = [
  ...Factories,
  ...CommandHandlers,
  ...Repositories,
  ...Subscribers,
  ...QueryHandlers,
  ...Services,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(Entities),
    TypeOrmUnitOfWorkModule,
    HttpModule.register({
      // force axios to use http adapter
      // so that aws x-ray can capture
      // the outgoing requests
      adapter: 'http',
    }),
    forwardRef(() => PromotionModule),
    VoucherModule,
  ],
  controllers: [...CommandControllers, ...QueryControllers],
  providers,
  exports: providers,
})
export class CartModule {}
