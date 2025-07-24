import { EntityId, Money, Quantity } from '@wings-corporation/domain';
import {
  PackQty,
  SalesFactor,
  SalesItemFactor,
  SalesItemPrice,
} from '@wings-online/cart/domains';
import {
  BaseReadModelMapper,
  ISalesUom,
  SalesTier,
  SalesUtil,
} from '@wings-online/common';
import { ParameterKeys } from '@wings-online/parameter/parameter.constants';
import { ParameterService } from '@wings-online/parameter/parameter.service';

import { TypeOrmItemEntity } from '../entities';
import {
  PRODUCT_DEFAULT_BASE_UOM,
  ProductLabel,
  RecommendationType,
} from '../product-catalog.constants';
import {
  LifetimePromotionReadModel,
  ProductPromotionReadModel,
  ProductReadModel,
  StrataAmountPromotionReadModel,
} from '../read-models';
import { ProductLifetimePromotionReadModel } from '../read-models/product-lifetime-promotion.read-model';
import { PromotionMapper } from './promotion.read-model.mapper';

export class ProductMapper extends BaseReadModelMapper<
  TypeOrmItemEntity,
  ProductReadModel
> {
  private readonly promotionMapper: PromotionMapper;

  constructor(private readonly parameterService: ParameterService) {
    super();
    this.promotionMapper = new PromotionMapper();
  }

  toReadModel(data: TypeOrmItemEntity): ProductReadModel {
    const uoms: ISalesUom[] = data.uoms.map((x) => ({
      tier: SalesTier.create(x.tier),
      name: x.uom,
      qty: PackQty.create(x.packQty),
    }));
    const baseUom = SalesUtil.getEffectiveBaseUom(
      data.baseUom || PRODUCT_DEFAULT_BASE_UOM,
      uoms,
    );

    const labels: ProductLabel[] = [];
    if (
      data.recommendationCs ||
      data.recommendationUs ||
      data.recommendationSimilar
    ) {
      labels.push(ProductLabel.RECOMMENDED);
    }

    if (data.bestSeller) {
      labels.push(ProductLabel.BEST_SELLER);
    }

    if (data.custItemHistory) {
      labels.push(ProductLabel.LOW_STOCK);
    }

    const salesConfig = SalesUtil.getEffectiveSalesConfig(
      data.salesConfigs.map((config) => SalesUtil.mapToSalesItemConfig(config)),
    );

    const { recommendationUs, recommendationSimilar, recommendationCs } = data;
    const recommendationQty: Map<
      RecommendationType,
      {
        base: Quantity;
        pack: Quantity;
      }
    > = new Map();
    if (recommendationUs) {
      recommendationQty.set(RecommendationType.FREQUENTLY_PURCHASED, {
        base: Quantity.create(recommendationUs.baseQty),
        pack: Quantity.create(recommendationUs.packQty),
      });
    }

    if (recommendationSimilar) {
      recommendationQty.set(RecommendationType.SIMILAR, {
        base: Quantity.create(recommendationSimilar.baseQty),
        pack: Quantity.create(recommendationSimilar.packQty),
      });
    }

    if (recommendationCs) {
      recommendationQty.set(RecommendationType.SELECTED, {
        base: Quantity.create(recommendationCs.baseQty),
        pack: Quantity.create(recommendationCs.packQty),
      });
    }

    const product = new ProductReadModel({
      id: EntityId.fromString(data.id),
      externalId: data.externalId,
      uom: {
        base: data.baseUom,
        intermediate: baseUom.name === data.baseUom ? undefined : baseUom.name,
        pack: data.packUom,
      },
      baseUom: baseUom.name,
      baseQty: Quantity.create(baseUom.qty.value),
      packUom: data.packUom,
      packQty:
        data.packUom && data.packQty
          ? Quantity.create(data.packQty)
          : undefined,
      name: data.info.name,
      brandId: data.info.brandId,
      brandName: data.info.brand?.description,
      type: data.info.type,
      description: data.info.description,
      imageUrl: data.info.imageUrl,
      factor: SalesUtil.getEffectiveSalesFactor(
        data.salesFactors.map((salesFactor) => {
          return SalesItemFactor.create(
            SalesTier.create(salesFactor.tier),
            SalesFactor.create(salesFactor.factor),
          );
        }),
      ),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      price: SalesUtil.getEffectiveSalesPrice(
        data.prices.map((itemPrice) => {
          return SalesItemPrice.create(
            SalesTier.create(itemPrice.tier),
            Money.create(itemPrice.price),
          );
        }),
      )!,
      categoryId: data.info.categoryId,
      labels,
      isFavorite: data.wishlistItems?.some((wi) => wi.wishlist?.isDefault),
      wishlistIds: data.wishlistItems
        ?.map((wi) => {
          return wi.wishlist ? EntityId.fromString(wi.wishlist.id) : undefined;
        })
        .filter(Boolean) as EntityId<string>[],
      tags: salesConfig ? salesConfig.tags : [],
      recommendationQty,
    });

    // apply promotions
    const productPromotion = new ProductPromotionReadModel(product);

    const lifetimePromoExternalType = this.parameterService.getOne(
      ParameterKeys.LIFETIME_PROMOTION_EXTERNAL_TYPE,
    );

    data.promoTPRTargets &&
      data.promoTPRTargets.map((x) => {
        const promo = this.promotionMapper.toReadModel({
          ...x,
          isRetailS: !!data.retailConfigs?.length,
        });

        if (!promo) {
          return;
        }

        if (promo.externalType === lifetimePromoExternalType?.value) {
          if (promo instanceof StrataAmountPromotionReadModel) {
            return;
          }

          product.applyLifetimePromotion(
            new ProductLifetimePromotionReadModel(
              product,
              promo as LifetimePromotionReadModel,
            ),
          );
        } else {
          productPromotion.addPromotion(promo);
        }
      });
    product.applyPromotion(productPromotion);

    return product;
  }
}
