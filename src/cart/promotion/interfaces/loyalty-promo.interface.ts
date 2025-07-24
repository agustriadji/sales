import { IPromo, PromoConditionOneOf, PromoCriteriaWithBenefit } from '.';

import {
  MinimumPurchaseAmountCriterion,
  ValueBenefit,
} from '@wings-online/common';

export type LoyaltyPromoCoinBenefit = ValueBenefit;
export type CreditMemoBenefit = ValueBenefit;

export interface LoyaltyPromoBenefit {
  coin?: LoyaltyPromoCoinBenefit;
  creditMemo?: CreditMemoBenefit;
}

export interface LoyaltyPromoCriteria extends PromoCriteriaWithBenefit {
  criterion: MinimumPurchaseAmountCriterion;
  benefit: LoyaltyPromoBenefit;
}

export interface LoyaltyPromoCondition extends PromoConditionOneOf {
  criteria: LoyaltyPromoCriteria[];
}

export interface LoyaltyPromo extends IPromo {
  type: 'LYL';
  condition: LoyaltyPromoCondition;
}
