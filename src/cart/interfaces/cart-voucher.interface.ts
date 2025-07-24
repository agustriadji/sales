import { EntityId, Money } from '@wings-corporation/domain';
import { ItemId, Tag } from '@wings-online/cart/domains';
import { DiscountBenefit } from '@wings-online/common';

export type VoucherId = EntityId<string>;

export type CartVoucher = ICartGeneralVoucher | ICartItemVoucher;

export interface ICartVoucher {
  type: 'general' | 'item';
  id: VoucherId;
  maxDiscount?: Money;
  benefit: DiscountBenefit;
  minPurchase: Money;
}

export interface ICartGeneralVoucher extends ICartVoucher {
  type: 'general';
}

export interface ICartItemVoucher extends ICartVoucher {
  type: 'item';
  target: ItemId | Tag;
  targetName: string;
}
