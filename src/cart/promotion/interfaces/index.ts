import { EntityId } from '@wings-corporation/domain';
import { ItemId, Tag } from '@wings-online/cart/domains';
import { TagCriteria } from '@wings-online/common';

import { FlashSalePromo } from './flash-sale-promo.interface';
import { PromoCondition } from './promo-condition.interface';
import { RegularPromo } from './regular-promo.interface';
import { TprPromo } from './tpr-promo.interface';

export * from './promo-cms-redemption.write-repository.interface';
export * from './promo.read-repository.interface';
export * from './promo.write-repository.interface';

export * from './promo-benefit.interface';
export * from './promo-condition.interface';
export * from './promo-criteria.interface';

export * from './flash-sale-promo.interface';
export * from './loyalty-promo.interface';
export * from './regular-promo.interface';
export * from './tpr-promo.interface';

export type PromoType = 'FLS' | 'REG' | 'TPR' | 'LYL';
export type ItemPromoType = 'FLS' | 'REG' | 'TPR';
export type PromoPriority = number;

export interface IPromo {
  id: EntityId<string>;
  type: PromoType;
  condition: PromoCondition;
}

export interface IItemPromo extends IPromo {
  type: ItemPromoType;
  itemId: ItemId | '*';
  tag?: Tag;
  externalType?: string;
  code: string;
  priority: PromoPriority;
  tagCriteria?: TagCriteria;
}

export type ItemPromo = TprPromo | RegularPromo | FlashSalePromo;
