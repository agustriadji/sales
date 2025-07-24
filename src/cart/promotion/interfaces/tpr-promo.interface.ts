import { IItemPromo } from '.';

import { EntityId, Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import {
  CriteriaWithoutBenefit,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
} from '@wings-online/common';

import {
  ItemPromoConditionAllOf,
  ItemPromoConditionOneOf,
} from './promo-condition.interface';
import {
  ItemPromoCriteriaWithBenefit,
  ItemPromoCriteriaWithoutBenefit,
} from './promo-criteria.interface';

type TprPromoDirectCriteria = CriteriaWithoutBenefit<
  MinimumPurchaseQtyCriterion | MinimumPurchaseQtyByTagCriterion
>;
export type TprPromoStrataCriteria = ItemPromoCriteriaWithBenefit;

interface ITprPromoCondition {
  id: EntityId<string>;
  criteria: ItemPromoCriteriaWithoutBenefit[] | ItemPromoCriteriaWithBenefit[];
  scaleQty: Quantity;
  scaleUomType: UomType;
  freeItemQty?: Quantity;
  freeItemUomType?: UomType;
  freeItemId?: string;
  priority: number;
}

export interface TprDirectPromoCondition
  extends ItemPromoConditionAllOf,
    ITprPromoCondition {
  criteria: TprPromoDirectCriteria[];
}

export interface TprStrataPromoCondition
  extends ItemPromoConditionOneOf,
    ITprPromoCondition {
  criteria: TprPromoStrataCriteria[];
}

export type TprPromoCondition =
  | TprDirectPromoCondition
  | TprStrataPromoCondition;

export interface TprPromo extends IItemPromo {
  type: 'TPR';
  condition: TprPromoCondition;
}

export interface TprDirectPromo extends TprPromo {
  condition: TprDirectPromoCondition;
}

export interface TprStrataPromo extends TprPromo {
  condition: TprStrataPromoCondition;
}
