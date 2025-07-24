import { Nullable } from '@wings-corporation/core';
import { Money, Quantity, ValueObject } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import { BenefitType, Uom } from '@wings-online/common';

import { MonetaryBenefit } from './monetary-benefit.vo';

export type FreeProduct = {
  id: string;
  externalId: string;
  name: Nullable<string>;
  qty: Quantity;
  uom: UomType;
  baseUom: Uom;
  intermediateUom: Nullable<Uom>;
  packUom: Nullable<Uom>;
};

type PromoBenefitProps = {
  type?: BenefitType;
  discount?: MonetaryBenefit;
  coin?: MonetaryBenefit;
  creditMemo?: Money;

  scaleQty: Quantity;
  scaleUomType: UomType;
  maxQty?: Quantity;
  maxUomType?: UomType;

  freeProduct?: FreeProduct;
};

export class PromoBenefit extends ValueObject<PromoBenefitProps> {
  public static create(props: PromoBenefitProps): PromoBenefit {
    return new PromoBenefit(props);
  }

  get discount(): MonetaryBenefit | undefined {
    return this._value.discount;
  }

  get coin(): MonetaryBenefit | undefined {
    return this._value.coin;
  }

  get creditMemo(): Money | undefined {
    return this._value.creditMemo;
  }

  get maxQty(): Quantity | undefined {
    return this._value.maxQty;
  }

  get scaleQty(): Quantity {
    return this._value.scaleQty;
  }

  get scaleUomType(): UomType {
    return this._value.scaleUomType;
  }

  get maxUomType(): UomType | undefined {
    return this._value.maxUomType;
  }

  get type(): BenefitType | undefined {
    return this._value.type;
  }

  get freeProduct(): FreeProduct | undefined {
    return this._value.freeProduct;
  }

  impactedQty(purchaseQty: Quantity) {
    return this._value.maxQty !== undefined
      ? this._value.maxQty.gt(purchaseQty)
        ? purchaseQty
        : this._value.maxQty
      : purchaseQty;
  }
}
