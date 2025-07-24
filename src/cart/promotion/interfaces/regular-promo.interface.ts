import { IItemPromo, ItemPromoConditionAllOf } from '.';

import { ItemId } from '@wings-online/cart/domains';
import { MinimumPurchaseQtyCriterion } from '@wings-online/common';

import { ItemPromoCriteriaWithoutBenefit } from './promo-criteria.interface';

export interface RegularPromoCriteria extends ItemPromoCriteriaWithoutBenefit {
  criterion: MinimumPurchaseQtyCriterion;
}

export interface RegularPromoCondition extends ItemPromoConditionAllOf {
  criteria: RegularPromoCriteria[];
}

export interface RegularPromo extends IItemPromo {
  itemId: ItemId | '*';
  type: 'REG';
  condition: RegularPromoCondition;
}
