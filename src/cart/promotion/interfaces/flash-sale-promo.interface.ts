import { IItemPromo } from '.';

import { Quantity } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import {
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
} from '@wings-online/common';

import { ItemPromoConditionAllOf } from './promo-condition.interface';
import { ItemPromoCriteriaWithoutBenefit } from './promo-criteria.interface';

export interface FlashSalePromoCriteria
  extends ItemPromoCriteriaWithoutBenefit {
  criterion: MinimumPurchaseQtyCriterion | MinimumPurchaseQtyByTagCriterion;
  minQtyUomType?: UomType;
}

export interface FlashSalePromoCondition extends ItemPromoConditionAllOf {
  criteria: FlashSalePromoCriteria[];
  maxQty: Quantity;
  maxQtyUomType?: UomType;
}

export interface FlashSalePromo extends IItemPromo {
  type: 'FLS';
  condition: FlashSalePromoCondition;
  redeemedQty: Quantity;
  startAt: Date;
  endAt: Date;
}
