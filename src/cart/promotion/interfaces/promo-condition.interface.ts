import {
  ConditionAllOf,
  ConditionOneOf,
  ConditionType,
  ICondition,
} from '@wings-online/common';

import { PromoBenefit } from './promo-benefit.interface';
import {
  ItemPromoCriteriaWithBenefit,
  ItemPromoCriteriaWithoutBenefit,
  PromoCriteriaWithBenefit,
  PromoCriteriaWithoutBenefit,
} from './promo-criteria.interface';

export type PromoConditionType = ConditionType;

export type IPromoCondition<T> = ICondition<T>;

export type PromoConditionOneOf = ConditionOneOf<PromoCriteriaWithBenefit>;

export type PromoConditionAllOf = ConditionAllOf<
  PromoCriteriaWithoutBenefit,
  PromoBenefit
>;

export type ItemPromoConditionOneOf =
  ConditionOneOf<ItemPromoCriteriaWithBenefit>;

export type ItemPromoConditionAllOf = ConditionAllOf<
  ItemPromoCriteriaWithoutBenefit,
  PromoBenefit
>;

export type PromoCondition = PromoConditionOneOf | PromoConditionAllOf;

export type ItemPromoCondition =
  | ItemPromoConditionOneOf
  | ItemPromoConditionAllOf;
