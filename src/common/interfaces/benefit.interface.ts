import { Money, Percentage } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import { SalesItemUomReadModel } from '@wings-online/cart/domains';

export type BenefitType = 'PERCENTAGE' | 'AMOUNT' | 'FREE_PRODUCT';

export type MonetaryBenefitType = 'PERCENTAGE' | 'AMOUNT';

export interface IMonetaryBenefit {
  type: MonetaryBenefitType;
  value: Percentage | Money;
  scaleUomType?: UomType;
}

export interface PercentageBenefit extends IMonetaryBenefit {
  type: 'PERCENTAGE';
  value: Percentage;
}

export interface ValueBenefit extends IMonetaryBenefit {
  type: 'AMOUNT';
  value: Money;
}

export type ProductBenefit = {
  type: 'FREE_PRODUCT';
  freeItem: SalesItemUomReadModel;
  freeItemQty: number;
  freeItemUomType: UomType;
};

export type DiscountBenefit = PercentageBenefit | ValueBenefit;
export type CoinBenefit = PercentageBenefit | ValueBenefit;
export type MonetaryBenefit = DiscountBenefit | CoinBenefit;
