import { Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import {
  CoinBenefit,
  DiscountBenefit,
  ProductBenefit,
} from '@wings-online/common';

export interface IPromoBenefit {
  discount?: DiscountBenefit;
  coin?: CoinBenefit;
  product?: ProductBenefit;
  maxQty?: Quantity;
  maxUomType?: UomType;
}

export interface PromoDiscountBenefit extends IPromoBenefit {
  discount: DiscountBenefit;
}

export interface PromoCoinBenefit extends IPromoBenefit {
  coin: CoinBenefit;
}

export type PromoBenefit = IPromoBenefit;
