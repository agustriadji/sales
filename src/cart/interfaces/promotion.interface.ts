import { EntityId, Money, Quantity } from '@wings-corporation/domain';
import { PromoConditionType } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';
import { PromoBenefit } from '@wings-online/cart/domains/promo-benefit.vo';
import { PromoCriteria } from '@wings-online/cart/domains/promo-criteria.vo';

export type ItemPurchase = {
  itemId: EntityId<string>;
  qty: Quantity;
  qtyIntermediate: Quantity;
  qtyPack: Quantity;
  subtotal: Money;
  addedAt: Date;
};

export type ItemTagPurchase = {
  tag: Tag;
  qty: Quantity;
  qtyIntermediate: Quantity;
  qtyPack: Quantity;
  subtotal: Money;
  items: ItemPurchase[];
};

type ItemId = string;
type TagString = string;
export type PurchaseSummary = {
  items: Record<ItemId, Omit<ItemPurchase, 'itemId'>>;
  tags: Record<TagString, Omit<ItemTagPurchase, 'tag'>>;
};

export type PurchaseSummaryPerItem = {
  itemId: EntityId<string>;
  amount: Money;
  qty: Quantity;
};

export type PurchaseSummaryPerTag = {
  tag: Tag;
  amount: Money;
  qty: Quantity;
};

export interface IPromotionCondition {
  type: PromoConditionType;
  criteria: PromoCriteria;

  benefitOf: (purchase: PurchaseSummary) => PromoBenefit | undefined;
}
