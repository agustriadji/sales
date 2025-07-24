import { OpensearchModule } from 'nestjs-opensearch';

import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmUnitOfWorkModule } from '@wings-corporation/nest-typeorm-uow';
import { OpensearchModuleOptionsProvider } from '@wings-online/providers';

import {
  TypeOrmBestSellerEntity,
  TypeOrmBrandEntity,
  TypeOrmBrandNewEntity,
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmCategoryBrandEntity,
  TypeOrmCategoryEntity,
  TypeOrmCategoryInfoEntity,
  TypeOrmCategoryParentEntity,
  TypeOrmCategorySequenceEntity,
  TypeOrmCustItemHistoryEntity,
  TypeOrmCustomerRewardEntity,
  TypeOrmDestCodeEntity,
  TypeOrmItemBarcodeEntity,
  TypeOrmItemEntity,
  TypeOrmItemExclusionEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemPriceEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmItemSalesFactorEntity,
  TypeOrmItemSalesRetailEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmParameterEntity,
  TypeOrmProductViewEntity,
  TypeOrmPromoTprCriteriaBenefitEntity,
  TypeOrmPromoTprCriteriaEntity,
  TypeOrmPromoTprDestCodeEntity,
  TypeOrmPromoTprEntity,
  TypeOrmPromoTprTagCriteriaEntity,
  TypeOrmPromoTprTargetBenefitEntity,
  TypeOrmPromoTprTargetEntity,
  TypeOrmRecommendationCsEntity,
  TypeOrmRecommendationSimilarEntity,
  TypeOrmRecommendationUsEntity,
  TypeOrmVoucherEntity,
  TypeOrmVoucherMaterialEntity,
  TypeOrmVoucherTargetEntity,
  TypeOrmWishlistEntity,
  TypeOrmWishlistItemEntity,
} from './entities';
import { TypeOrmCartTagEntity } from './entities/typeorm.cart-tag.entity';
import {
  BRAND_READ_REPOSITORY,
  BRAND_SEARCH_READ_REPOSITORY,
  CATEGORY_PARENT_READ_REPOSITORY,
  CATEGORY_READ_REPOSITORY,
  CATEGORY_SEQUENCE_READ_REPOSITORY,
  FILTER_READ_REPOSITORY,
  PRODUCT_CATALOG_SERVICE,
  PRODUCT_HELPER_REPOSITORY,
  PRODUCT_READ_REPOSITORY,
  PRODUCT_SEARCH_READ_REPOSITORY,
  PRODUCT_VIEWS_READ_REPOSITORY,
  PRODUCT_VIEWS_WRITE_REPOSITORY,
} from './product-catalog.constants';
import { PromotionModule } from './promotion';
import { GetFilterController, GetFilterHandler } from './queries/get-filter';
import {
  GetProductByBarcodeController,
  GetProductByBarcodeHandler,
} from './queries/get-product-by-barcode';
import { GetProductFilterController } from './queries/get-product-filter/get-product-filter.controller';
import { GetProductFilterHandler } from './queries/get-product-filter/get-product-filter.handler';
import {
  GetProductIdByExternalIdController,
  GetProductIdByExternalIdHandler,
} from './queries/get-product-id-by-external-id';
import {
  GetProductInfoController,
  GetProductInfoHandler,
} from './queries/get-product-info';
import {
  ListBestSellerProductsController,
  ListBestSellerProductsHandler,
} from './queries/list-best-seller-products';
import { ListBrandController, ListBrandHandler } from './queries/list-brand';
import {
  ListBrandVariantsController,
  ListBrandVariantsHandler,
} from './queries/list-brand-variant';
import {
  ListCategoryController,
  ListCategoryHandler,
} from './queries/list-category';
import {
  ListCategoryParentController,
  ListCategoryParentHandler,
} from './queries/list-category-parent';
import {
  ListCategoryProductsController,
  ListCategoryProductsHandler,
} from './queries/list-category-products';
import {
  ListFlashSaleProductsController,
  ListFlashSaleProductsHandler,
} from './queries/list-flash-sale-products';
import {
  ListFrequentlyPurchasedProductsController,
  ListFrequentlyPurchasedProductsHandler,
} from './queries/list-frequently-purchased-products';
import {
  ListNewProductsController,
  ListNewProductsHandler,
} from './queries/list-new-products';
import { ListProductPromotionsController } from './queries/list-product-promotions/list-product-promotions.controller';
import { ListProductPromotionsHandler } from './queries/list-product-promotions/list-product-promotions.handler';
import {
  ListProductViewsController,
  ListProductViewsHandler,
} from './queries/list-product-views';
import { ListProductVouchersController } from './queries/list-product-vouchers/list-product-vouchers.controller';
import { ListProductVouchersHandler } from './queries/list-product-vouchers/list-product-vouchers.handler';
import {
  ListProductsController,
  ListProductsHandler,
} from './queries/list-products';
import {
  ListSelectedProductsController,
  ListSelectedProductsHandler,
} from './queries/list-selected-products';
import {
  ListSimilarProductsController,
  ListSimilarProductsHandler,
} from './queries/list-similar-products';
import {
  ListTPRProductsController,
  ListTPRProductsHandler,
} from './queries/list-tpr-products';
import './queries/search-brands';
import {
  SearchBrandsController,
  SearchBrandsHandler,
} from './queries/search-brands';
import {
  SearchProductsController,
  SearchProductsHandler,
} from './queries/search-products';
import {
  SuggestSearchProductsController,
  SuggestSearchProductsHandler,
} from './queries/suggest-search-products';
import {
  OpensearchBrandSearchReadRepository,
  OpensearchProductSearchReadRepository,
  TypeOrmBrandReadRepository,
  TypeOrmCategoryParentReadRepository,
  TypeOrmCategoryReadRepository,
  TypeOrmCategorySequenceReadRepository,
  TypeOrmFilterReadRepository,
  TypeOrmProductHelperRepository,
  TypeOrmProductReadRepository,
  TypeOrmProductViewsReadRepository,
  TypeOrmProductViewsWriteRepository,
} from './repositories';
import { DefaultProductCatalogService } from './services/default.product-catalog.service';
import {
  CartChangedSubscriber,
  ProductViewedSubscriber,
  WishlistChangedSubscriber,
} from './subscribers';

const Entities = [
  TypeOrmBestSellerEntity,
  TypeOrmBrandEntity,
  TypeOrmBrandNewEntity,
  TypeOrmCartEntity,
  TypeOrmCartItemEntity,
  TypeOrmCartTagEntity,
  TypeOrmCategoryBrandEntity,
  TypeOrmCategoryEntity,
  TypeOrmCategoryInfoEntity,
  TypeOrmCategoryParentEntity,
  TypeOrmCustItemHistoryEntity,
  TypeOrmCustomerRewardEntity,
  TypeOrmDestCodeEntity,
  TypeOrmItemBarcodeEntity,
  TypeOrmItemEntity,
  TypeOrmItemExclusionEntity,
  TypeOrmItemInfoEntity,
  TypeOrmItemPriceEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmItemSalesConfigEntity,
  TypeOrmItemSalesFactorEntity,
  TypeOrmItemSalesRetailEntity,
  TypeOrmItemSalesUomEntity,
  TypeOrmParameterEntity,
  TypeOrmProductViewEntity,
  TypeOrmPromoTprCriteriaBenefitEntity,
  TypeOrmPromoTprCriteriaEntity,
  TypeOrmPromoTprDestCodeEntity,
  TypeOrmPromoTprEntity,
  TypeOrmPromoTprTagCriteriaEntity,
  TypeOrmPromoTprTargetBenefitEntity,
  TypeOrmPromoTprTargetEntity,
  TypeOrmRecommendationCsEntity,
  TypeOrmRecommendationSimilarEntity,
  TypeOrmRecommendationUsEntity,
  TypeOrmVoucherEntity,
  TypeOrmVoucherMaterialEntity,
  TypeOrmVoucherTargetEntity,
  TypeOrmWishlistEntity,
  TypeOrmWishlistItemEntity,
  TypeOrmCategorySequenceEntity,
];

const Repositories: Provider<any>[] = [
  {
    provide: PRODUCT_VIEWS_READ_REPOSITORY,
    useClass: TypeOrmProductViewsReadRepository,
  },
  {
    provide: PRODUCT_VIEWS_WRITE_REPOSITORY,
    useClass: TypeOrmProductViewsWriteRepository,
  },
  {
    provide: PRODUCT_READ_REPOSITORY,
    useClass: TypeOrmProductReadRepository,
  },
  {
    provide: CATEGORY_READ_REPOSITORY,
    useClass: TypeOrmCategoryReadRepository,
  },
  {
    provide: BRAND_READ_REPOSITORY,
    useClass: TypeOrmBrandReadRepository,
  },
  {
    provide: BRAND_SEARCH_READ_REPOSITORY,
    useClass: OpensearchBrandSearchReadRepository,
  },
  {
    provide: PRODUCT_SEARCH_READ_REPOSITORY,
    useClass: OpensearchProductSearchReadRepository,
  },
  {
    provide: CATEGORY_PARENT_READ_REPOSITORY,
    useClass: TypeOrmCategoryParentReadRepository,
  },
  {
    provide: FILTER_READ_REPOSITORY,
    useClass: TypeOrmFilterReadRepository,
  },
  {
    provide: CATEGORY_SEQUENCE_READ_REPOSITORY,
    useClass: TypeOrmCategorySequenceReadRepository,
  },
  {
    provide: PRODUCT_HELPER_REPOSITORY,
    useClass: TypeOrmProductHelperRepository,
  },
];

const QueryControllers = [
  GetFilterController,
  GetProductByBarcodeController,
  GetProductFilterController,
  GetProductInfoController,
  ListBestSellerProductsController,
  ListBrandController,
  ListBrandVariantsController,
  ListCategoryController,
  ListCategoryParentController,
  ListCategoryProductsController,
  ListFrequentlyPurchasedProductsController,
  ListNewProductsController,
  ListProductPromotionsController,
  ListProductsController,
  ListProductViewsController,
  ListProductVouchersController,
  ListSelectedProductsController,
  ListSimilarProductsController,
  SearchBrandsController,
  SearchProductsController,
  ListFlashSaleProductsController,
  SuggestSearchProductsController,
  ListTPRProductsController,
  GetProductIdByExternalIdController,
];

const QueryHandlers = [
  GetFilterHandler,
  GetProductByBarcodeHandler,
  GetProductFilterHandler,
  GetProductInfoHandler,
  ListBestSellerProductsHandler,
  ListBrandHandler,
  ListBrandVariantsHandler,
  ListCategoryHandler,
  ListCategoryParentHandler,
  ListCategoryProductsHandler,
  ListFrequentlyPurchasedProductsHandler,
  ListNewProductsHandler,
  ListProductPromotionsHandler,
  ListProductsHandler,
  ListProductViewsHandler,
  ListProductVouchersHandler,
  ListSelectedProductsHandler,
  ListSimilarProductsHandler,
  SearchBrandsHandler,
  SearchProductsHandler,
  ListFlashSaleProductsHandler,
  SuggestSearchProductsHandler,
  ListTPRProductsHandler,
  GetProductIdByExternalIdHandler,
];

const Services = [
  { provide: PRODUCT_CATALOG_SERVICE, useClass: DefaultProductCatalogService },
];

const Subscribers = [
  ProductViewedSubscriber,
  WishlistChangedSubscriber,
  CartChangedSubscriber,
];

const providers = [
  ...QueryHandlers,
  ...Repositories,
  ...Subscribers,
  ...Services,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature(Entities),
    TypeOrmUnitOfWorkModule,
    // TODO move to app.module
    // idk what happened but when this is applied on app.module
    // the injection is not working properly
    OpensearchModule.forRootAsync({
      inject: [ConfigService],
      useClass: OpensearchModuleOptionsProvider,
    }),
    PromotionModule,
  ],
  controllers: [...QueryControllers],
  providers,
  exports: providers,
})
export class ProductCatalogModule {}
