import {
  MinimumPurchaseAmountCriterion,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
  PurchaseAmountBetweenCriterion,
  PurchaseQtyBetweenByTagCriterion,
  PurchaseQtyBetweenCriterion,
} from '@wings-online/common';

export type ItemPromoCriterion =
  | MinimumPurchaseAmountCriterion
  | MinimumPurchaseQtyCriterion
  | MinimumPurchaseQtyByTagCriterion
  | PurchaseQtyBetweenCriterion
  | PurchaseQtyBetweenByTagCriterion
  | PurchaseAmountBetweenCriterion;

export type PromoCriterion =
  | MinimumPurchaseAmountCriterion
  | MinimumPurchaseAmountCriterion
  | MinimumPurchaseQtyCriterion
  | MinimumPurchaseQtyByTagCriterion
  | PurchaseQtyBetweenCriterion
  | PurchaseQtyBetweenCriterion
  | PurchaseQtyBetweenByTagCriterion
  | PurchaseAmountBetweenCriterion;

export type TagPromoCriterion =
  | MinimumPurchaseQtyByTagCriterion
  | PurchaseQtyBetweenByTagCriterion;
