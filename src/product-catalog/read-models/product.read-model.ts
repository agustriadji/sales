import {
  FlashSaleReadModel,
  JsonProductPromotionReadModelProps,
  ProductPromotionReadModel,
} from '.';

import { Nullable } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import { SalesFactor, Tag } from '@wings-online/cart/domains';
import { MathUtil, ReadModel } from '@wings-online/common';
import { WishlistId } from '@wings-online/wishlist/domains';

import { ProductId } from '../domains';
import {
  ProductLabel,
  ProductType,
  RecommendationType,
} from '../product-catalog.constants';
import { UomTypeEnum } from '../promotion';
import { CartUtil } from '../utils/cart.util';
import {
  JsonFlashSaleProps,
  ProductFlashSaleReadModel,
} from './product-flash-sale.read-model';
import {
  JsonProductLifetimePromotionReadModelProps,
  ProductLifetimePromotionReadModel,
} from './product-lifetime-promotion.read-model';
import { QtyInCartReadModel } from './qty-in-cart.read-model';

type ProductReadModelProps = {
  id: ProductId;
  externalId: string;
  uom: {
    base: string;
    intermediate?: string;
    pack?: string;
  };
  baseUom: string;
  baseQty: Quantity;
  packUom?: string;
  packQty?: Quantity;
  name: string;
  type: ProductType;
  description?: string;
  imageUrl: string;
  factor: SalesFactor;
  price: Money;
  categoryId?: number;
  brandId?: number;
  brandName?: string;
  cartBaseQty?: Quantity;
  cartPackQty?: Quantity;
  labels: ProductLabel[];
  isFavorite?: boolean;
  wishlistIds?: WishlistId[];
  tags: Tag[];
  recommendationQty: Map<
    RecommendationType,
    {
      base: Quantity;
      pack: Quantity;
    }
  >;
  addedToCartAt?: Date;
};

type ProductUoMProps = {
  uom: string;
  price: {
    listed: number;
    offered: number;
  };
  pack_qty: number;
  cart_qty: number;
  is_sellable: boolean;
  recommendation_qty: Record<string, number>;
};

export type JsonProductProps = {
  id: string;
  external_id: string;
  name: string;
  brand_id: Nullable<number>;
  brand_name: Nullable<string>;
  type: ProductType;
  description: string;
  image_url: string;
  category_id: Nullable<number>;
  sales_factor: number;
  base: ProductUoMProps;
  pack: Nullable<ProductUoMProps>;
  labels: ProductLabel[];
  is_favorite?: boolean;
  wishlist_ids?: string[];
  lifetime_promotion?: JsonProductLifetimePromotionReadModelProps;
  flash_sale?: JsonFlashSaleProps;
  promotions?: Partial<JsonProductPromotionReadModelProps>[];
  tags: string[];
  uom: {
    base: string;
    intermediate: Nullable<string>;
    pack: Nullable<string>;
  };
};

export class ProductReadModel extends ReadModel {
  private _promotion: ProductPromotionReadModel;
  private _flashSale: ProductFlashSaleReadModel;
  private _lifetimePromotion: ProductLifetimePromotionReadModel | undefined;

  private _qtyInCart: QtyInCartReadModel;

  constructor(private readonly props: ProductReadModelProps) {
    super();
    this._promotion = new ProductPromotionReadModel(this);
    this._flashSale = new ProductFlashSaleReadModel(this);

    this._qtyInCart = new QtyInCartReadModel(this);
  }

  get price(): Money {
    return this.props.price;
  }

  get baseQty(): Quantity {
    return this.props.baseQty;
  }

  get packQty(): Quantity {
    return this.props.packQty || Quantity.create(1);
  }

  get baseUom() {
    return this.props.baseUom;
  }

  get packUom() {
    return this.props.packUom;
  }

  get baseUomType(): UomType {
    if (this.baseUom === this.props.uom.pack) {
      return UomTypeEnum.PACK;
    } else if (this.baseUom === this.props.uom.intermediate) {
      return UomTypeEnum.INTERMEDIATE;
    }
    return UomTypeEnum.BASE;
  }

  get id(): string {
    return this.props.id.value;
  }

  get cartQty(): Quantity {
    return this.cartBaseQty.add(this.cartPackQty);
  }

  get cartBaseQty(): Quantity {
    return this.props.cartBaseQty || Quantity.zero();
  }

  get cartPackQty(): Quantity {
    return this.props.cartPackQty || Quantity.zero();
  }

  get discountedPrice(): Money {
    const flashSalePrice = this._flashSale.isStarted
      ? this.price.subtract(
          this._flashSale.discountAmount.add(
            this.lifetimePromotion?.discountAmount || Money.zero(),
          ),
        )
      : this.price;
    const promotionPrice = this.price.subtract(
      this._promotion.discountAmount.add(
        this.lifetimePromotion?.discountAmount || Money.zero(),
      ),
    );
    return flashSalePrice.lt(promotionPrice) ? flashSalePrice : promotionPrice;
  }

  get promotion(): ProductPromotionReadModel {
    return this._promotion;
  }

  get flashSale(): ProductFlashSaleReadModel {
    return this._flashSale;
  }

  get lifetimePromotion(): ProductLifetimePromotionReadModel | undefined {
    return this._lifetimePromotion;
  }

  get tags(): Tag[] {
    return this.props.tags;
  }

  get hasPackUom(): boolean {
    return this.props.packUom !== undefined && this.props.packQty !== undefined;
  }

  get isBaseSellable(): boolean {
    const { packQty } = this.props;

    const salesFactor = this.salesFactor;
    const isBaseSellable =
      packQty && packQty.value !== 1 ? salesFactor % packQty.value != 0 : true;
    return isBaseSellable;
  }

  get isPackSellable(): boolean {
    return this.hasPackUom;
  }

  get salesFactor() {
    const { baseQty, factor } = this.props;
    return MathUtil.lcm([baseQty.value, factor.value]);
  }

  get qtyInCart(): QtyInCartReadModel {
    return this._qtyInCart;
  }

  get addedToCartAt(): Date | undefined {
    return this.props.addedToCartAt;
  }

  get hasIntermediateUoM(): boolean {
    return this.props.baseQty.value !== 1;
  }

  applyFlashSale(flashsale: FlashSaleReadModel) {
    if (flashsale.target.type === 'TAG') {
      if (
        !this.props.tags.some((tag) =>
          tag.equals(Tag.fromString(flashsale.target.value)),
        )
      ) {
        return;
      }
    } else {
      if (this.props.id.value !== flashsale.target.value) {
        return;
      }
    }

    this._flashSale.applyPromotion(flashsale);

    if (!this.props.labels.includes(ProductLabel.FLASH_SALE)) {
      this.props.labels.push(ProductLabel.FLASH_SALE);
    }
  }

  applyPromotion(promotion: ProductPromotionReadModel) {
    if (promotion.productId === this.props.id.value) {
      this._promotion = promotion;
    }

    if (
      promotion.includeRegularPromotion &&
      !this.props.labels.includes(ProductLabel.APP_PROMOTION)
    ) {
      this.props.labels.push(ProductLabel.APP_PROMOTION);
    }
  }

  applyLifetimePromotion(lifetimePromotion: ProductLifetimePromotionReadModel) {
    this._lifetimePromotion = lifetimePromotion;
  }

  setCartQty(totalQty: Quantity) {
    const uomCartQty = CartUtil.getUomCartQty(
      totalQty,
      this.packUom ? this.packQty : undefined,
    );

    this.props.cartBaseQty = uomCartQty.base;
    this.props.cartPackQty = uomCartQty.pack;
  }

  setAddedToCartAt(addedAt: Date) {
    this.props.addedToCartAt = addedAt;
  }

  toJSON(): JsonProductProps {
    const { price, packQty } = this.props;

    const recommendationBaseQty = {};
    const recommendationPackQty = {};
    for (const [key, qty] of this.props.recommendationQty) {
      recommendationBaseQty[key] = qty.base.value;
      recommendationPackQty[key] = qty.pack.value;
    }

    return {
      id: this.props.id.value,
      external_id: this.props.externalId,
      name: this.props.name,
      brand_id: this.props.brandId || null,
      brand_name: this.props.brandName || null,
      type: this.props.type,
      description: this.props.description || '',
      image_url: this.props.imageUrl,
      category_id: this.props.categoryId || null,
      sales_factor: this.salesFactor,
      uom: {
        base: this.props.uom.base,
        intermediate: this.props.uom.intermediate || null,
        pack: this.props.uom.pack || null,
      },
      base: {
        uom: this.props.baseUom,
        price: {
          listed: price.value * this.props.baseQty.value,
          offered: Math.ceil(
            this.discountedPrice.value * this.props.baseQty.value,
          ),
        },
        pack_qty: this.props.baseQty.value,
        cart_qty: this.props.cartBaseQty?.value || 0,
        is_sellable: this.isBaseSellable,
        recommendation_qty: recommendationBaseQty,
      },
      pack:
        this.props.packUom && packQty
          ? {
              uom: this.props.packUom,
              price: {
                listed: price.value * packQty.value,
                offered: Math.ceil(this.discountedPrice.value * packQty.value),
              },
              pack_qty: packQty.value,
              cart_qty: this.props.cartPackQty?.value || 0,
              is_sellable: true,
              recommendation_qty: recommendationPackQty,
            }
          : null,
      labels: this.props.labels,
      is_favorite: this.props.isFavorite,
      wishlist_ids: this.props.wishlistIds?.map((wi) => wi.value),
      lifetime_promotion: this._lifetimePromotion?.toJSON(),
      promotions: this._promotion?.toJSON(),
      flash_sale: this._flashSale.id ? this._flashSale.toJSON() : undefined,
      tags: this.props.tags.map((tag) => tag.toString()),
    };
  }
}
