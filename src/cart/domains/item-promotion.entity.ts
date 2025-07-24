import { Entity, EntityId } from '@wings-corporation/domain';

import { FlashSale } from './flash-sale.vo';
import { RegularPromo } from './regular-promo.vo';
import { TPRPromo } from './tpr-promo.vo';

type Promotion = TPRPromo | RegularPromo | FlashSale;

type ItemPromotionProps<T extends Promotion> = {
  itemId: EntityId<string>;
  promotion: T;
};

export type ItemFlashSale = ItemPromotion<FlashSale>;
export type ItemRegularPromotions = ItemPromotion<TPRPromo | RegularPromo>;
export type ItemLifetimePromotion = ItemPromotion<TPRPromo>;

export class ItemPromotion<T extends Promotion = Promotion> extends Entity<
  ItemPromotionProps<T>,
  string
> {
  private constructor(props: ItemPromotionProps<T>, id?: string) {
    super(props, id ? EntityId.fromString(id) : undefined);
  }

  public static create<T extends Promotion>(
    props: ItemPromotionProps<T>,
    id?: string,
  ) {
    return new ItemPromotion(props, id);
  }

  get itemId(): EntityId<string> {
    return this._props.itemId;
  }

  get promotion(): T {
    return this._props.promotion;
  }
}
