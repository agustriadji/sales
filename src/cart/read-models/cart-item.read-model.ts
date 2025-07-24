import { Nullable } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { ItemPromo, TprPromo } from '@wings-online/cart/promotion';
import { ReadModel } from '@wings-online/common';
import { ProductLabel } from '@wings-online/product-catalog';

import { Tag } from '../domains';
import {
  CartItemLifetimePromoReadModel,
  JsonCartItemLifetimePromoProps,
} from './cart-item-lifetime-promo.read-model';
import { CartQtyReadModel } from './cart-qty.read-model';
import { CartReadModel } from './cart.read-model';
import {
  FlashSaleCartItemReadModel,
  JsonFlashSaleCartItemProps,
} from './flash-sale-cart-item.read-model';
import { ItemReadModel } from './item.read-model';
import {
  JsonRegularCartItemProps,
  RegularCartItemReadModel,
} from './regular-cart-item.read-model';

export type JsonPromoCriteriaProps = {
  qty: number;
  discount: number;
  coin: number;
};

type CartItemReadModelProps = {
  id: string;
  cart?: CartReadModel;
  item: ItemReadModel;
  qty: number;
  qtyIntermediate: number;
  qtyPack: number;
  price: number;
  addedAt: Date;
};

export type ProductUoMProps = {
  uom: string;
  pack_qty: number;
  is_sellable: boolean;
};

export type JsonCartItemProps = {
  item_id: string;
  item_external_id: string;
  item_name: Nullable<string>;
  item_image_url: Nullable<string>;
  item_tags: string[];
  uom: {
    base: string;
    intermediate: Nullable<string>;
    pack: Nullable<string>;
  };
  base: ProductUoMProps;
  pack: Nullable<ProductUoMProps>;
  sales_factor: number;
  lifetime_promotion?: JsonCartItemLifetimePromoProps;
  flash_sale?: JsonFlashSaleCartItemProps;
  regular: JsonRegularCartItemProps;
  subtotal: number;
  labels: ProductLabel[];
};

export type PurchaseQtyByTagDetail = {
  tag: Tag;
  items: Array<{
    itemId: string;
    qty: Quantity;
    addedAt: Date;
  }>;
};

export class CartItemReadModel extends ReadModel {
  public flashSale: FlashSaleCartItemReadModel;
  public regular: RegularCartItemReadModel;

  public lifetimePromo: CartItemLifetimePromoReadModel;

  private _cartQty: CartQtyReadModel;
  private simulatedPrice: Money | undefined;

  constructor(readonly props: CartItemReadModelProps) {
    super();

    this.regular = new RegularCartItemReadModel(this);
    this.flashSale = new FlashSaleCartItemReadModel(this);
    this.lifetimePromo = new CartItemLifetimePromoReadModel(this);
    this._cartQty = new CartQtyReadModel();
  }

  get id(): string {
    return this.props.id;
  }

  get item(): ItemReadModel {
    return this.props.item;
  }

  get qty(): Quantity {
    return Quantity.create(this.props.qty);
  }

  get qtyIntermediate(): Quantity {
    return Quantity.create(this.props.qtyIntermediate);
  }

  get qtyPack(): Quantity {
    return Quantity.create(this.props.qtyPack);
  }

  get price(): Money {
    if (this.simulatedPrice) return this.simulatedPrice;
    return Money.create(this.props.price);
  }

  get basePrice(): Money {
    return this.price.multiply(Quantity.create(this.item.baseQty));
  }

  get packPrice(): Money | undefined {
    if (!this.item.packUoM || !this.item.packQty) {
      return;
    }

    return this.price.multiply(Quantity.create(this.item.packQty));
  }

  get flashSaleId(): string | null {
    return this.flashSale ? this.flashSale.id : null;
  }

  get flashSaleCode(): string | null {
    return this.flashSale.code;
  }

  get flashSaleQty(): Quantity {
    return this.flashSale ? this.flashSale.qty : Quantity.zero();
  }

  get flashSaleTotalDiscount(): Money {
    return this.flashSale ? this.flashSale.totalDiscount : Money.zero();
  }

  get flashSaleTotalCoin(): Money {
    return this.flashSale ? this.flashSale.totalCoin : Money.zero();
  }

  get flashSaleSubtotal(): Money {
    return this.flashSale ? this.flashSale.subtotal : Money.zero();
  }

  get regularPromotion(): RegularCartItemReadModel {
    return this.regular;
  }

  get regularQty(): Quantity {
    return this.qty.subtract(this.flashSaleQty);
  }

  get regularDiscount(): Money {
    return this.regular.totalDiscount;
  }

  get regularTotal(): Money {
    return this.regular.total;
  }

  get totalDiscount(): Money {
    return this.regular.totalDiscount.add(this.flashSaleTotalDiscount);
  }

  get coin(): Money {
    return this.regular.totalCoin.add(this.flashSaleTotalCoin);
  }

  get subtotal(): Money {
    return this.regular.subtotal.add(this.flashSaleSubtotal);
  }

  get addedAt(): Date {
    return this.props.addedAt;
  }

  get cartQty(): CartQtyReadModel {
    return this._cartQty;
  }

  setCartQty(cartQty: CartQtyReadModel) {
    return (this._cartQty = cartQty);
  }

  applyPromotion(promo: ItemPromo): void {
    if (promo.type === 'FLS') {
      this.flashSale.applyPromotion(promo);

      if (!this.item.labels.includes(ProductLabel.FLASH_SALE)) {
        this.item.labels.push(ProductLabel.FLASH_SALE);
      }
    } else {
      this.regular.addPromotion(promo);
    }
  }

  applyLifetimePromotion(promo: TprPromo) {
    this.lifetimePromo.applyPromotion(promo);
  }

  purchaseQtyOfUomType(uomType: UomType): Quantity {
    if (uomType === UomTypeEnum.BASE) {
      return this.qty;
    } else if (uomType === UomTypeEnum.PACK) {
      return Quantity.create(Math.floor(this.qty.value / this.item.packQty));
    } else if (
      uomType === UomTypeEnum.INTERMEDIATE &&
      this.item.hasIntermediateUoM()
    ) {
      return Quantity.create(Math.floor(this.qty.value / this.item.baseQty));
    } else {
      return Quantity.zero();
    }
  }

  setSimulatedPrice(price: number) {
    this.simulatedPrice = Money.create(price);
  }

  toJSON(): JsonCartItemProps {
    return {
      item_id: this.item.id,
      item_external_id: this.item.externalId,
      item_name: this.item.name,
      item_image_url: this.item.imageUrl,
      item_tags: this.item.tags,
      uom: {
        base: this.item.uom.base,
        intermediate: this.item.uom.intermediate || null,
        pack: this.item.uom.pack || null,
      },
      base: {
        uom: this.item.baseUoM,
        pack_qty: this.item.baseQty,
        is_sellable: this.item.isBaseSellable,
      },
      pack:
        this.item.packUoM && this.item.packQty
          ? {
              uom: this.item.packUoM,
              pack_qty: this.item.packQty,
              is_sellable: this.item.isPackSellable,
            }
          : null,
      sales_factor: this.item.salesFactor,
      lifetime_promotion: this.lifetimePromo.toJSON(),
      flash_sale: this.flashSale ? this.flashSale.toJSON() : undefined,
      regular: this.regular.toJSON(),
      subtotal: this.subtotal.value,
      labels: this.item.labels,
    };
  }
}
