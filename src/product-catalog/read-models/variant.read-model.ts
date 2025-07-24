import { Nullable } from '@wings-corporation/core';
import { EntityId, Quantity } from '@wings-corporation/domain';
import { ReadModel } from '@wings-online/common';

import { CartUtil } from '../utils/cart.util';

type VariantReadModelProps = {
  itemId: EntityId<string>;
  tags: string[];
  variant: string;
  imageUrl: string;
  baseUom: string;
  packUom?: string;
  baseQty: Quantity;
  packQty?: Quantity;
  cartBaseQty?: Quantity;
  cartPackQty?: Quantity;
  hasCombinablePromo?: boolean;
};

type VariantUoMProps = {
  cart_qty: number;
  pack_qty: number;
  uom: string;
};

type JsonVariantProps = {
  item_id: string;
  variant: string;
  image_url: string;
  base: VariantUoMProps;
  pack: Nullable<VariantUoMProps>;
  has_combinable_promo: boolean;
};

export class VariantReadModel extends ReadModel {
  constructor(readonly props: VariantReadModelProps) {
    super();
  }

  setHasCombinablePromo(hasCombinablePromo: boolean): void {
    this.props.hasCombinablePromo = hasCombinablePromo;
  }

  setCartQty(cartQty: Quantity) {
    const uomCartQty = CartUtil.getUomCartQty(
      cartQty,
      this.props.packUom && this.props.packQty ? this.props.packQty : undefined,
    );
    this.props.cartBaseQty = uomCartQty.base;
    this.props.cartPackQty = uomCartQty.pack;
  }

  toJSON(): JsonVariantProps {
    return {
      item_id: this.props.itemId.value,
      variant: this.props.variant,
      image_url: this.props.imageUrl,
      base: {
        cart_qty: this.props.cartBaseQty?.value || 0,
        pack_qty: this.props.baseQty.value,
        uom: this.props.baseUom,
      },
      pack:
        this.props.packUom && this.props.packQty
          ? {
              cart_qty: this.props.cartPackQty?.value || 0,
              pack_qty: this.props.packQty.value,
              uom: this.props.packUom,
            }
          : null,
      has_combinable_promo: this.props.hasCombinablePromo || false,
    };
  }
}
