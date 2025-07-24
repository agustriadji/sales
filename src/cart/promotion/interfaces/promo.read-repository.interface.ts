import {
  FlashSalePromo,
  LoyaltyPromo,
  RegularPromo,
  TprPromo,
} from '@wings-online/cart/promotion';
import { UserIdentity } from '@wings-online/common';

export type GetPromotionFilter = {
  freeProductOnly?: boolean;
};

export type GetTPRPromotionItem = {
  id: string;
  baseQty: number;
  packQty: number;
  tags: string[];
};

export interface IPromoReadRepository {
  getLoyaltyPromo(identity: UserIdentity): Promise<LoyaltyPromo | undefined>;

  getItemFlashSale(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<FlashSalePromo[]>;

  getItemRegularPromotions(
    identity: UserIdentity,
    itemIds: string[],
    tags: string[],
  ): Promise<RegularPromo[]>;

  getItemTPRPromotions(
    identity: UserIdentity,
    items: GetTPRPromotionItem[],
    filter?: GetPromotionFilter,
  ): Promise<TprPromo[]>;

  getFreeProductsPromotions(
    identity: UserIdentity,
    productIds: string[],
  ): Promise<TprPromo[]>;

  getItemNearestUpcomingFlashSale(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<FlashSalePromo | undefined>;
}
