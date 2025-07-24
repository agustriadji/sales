import {
  CriteriaWithBenefit,
  CriteriaWithoutBenefit,
} from '@wings-online/common';

import { PromoBenefit } from './promo-benefit.interface';
import { ItemPromoCriterion, PromoCriterion } from './promotion.interface';

export type PromoCriteria =
  | PromoCriteriaWithBenefit
  | PromoCriteriaWithoutBenefit;

export type ItemPromoCriteria =
  | ItemPromoCriteriaWithBenefit
  | ItemPromoCriteriaWithoutBenefit;

export type PromoCriteriaWithBenefit = CriteriaWithBenefit<
  PromoCriterion,
  PromoBenefit
>;

export type PromoCriteriaWithoutBenefit =
  CriteriaWithoutBenefit<PromoCriterion>;

export type ItemPromoCriteriaWithBenefit = CriteriaWithBenefit<
  ItemPromoCriterion,
  PromoBenefit
>;

export type ItemPromoCriteriaWithoutBenefit =
  CriteriaWithoutBenefit<ItemPromoCriterion>;
