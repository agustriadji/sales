import {
  EntityId,
  Money,
  Quantity,
  ValueObject,
} from '@wings-corporation/domain';
import { UomTypeEnum } from '@wings-online/app.constants';
import {
  ItemPurchase,
  ItemTagPurchase,
  PurchaseSummaryPerItem,
  PurchaseSummaryPerTag,
} from '@wings-online/cart/interfaces/promotion.interface';
import { PromoUtil, TagCriteria } from '@wings-online/common';

import { PromoBenefit } from './promo-benefit.vo';
import { Tag } from './tag.vo';

export interface IPromoCriterion<TMetCriterionProps> {
  check(props: TMetCriterionProps): boolean;
}

type MinimumItemPurchaseCriterionProps = {
  itemId: EntityId<string>;
  minQty: Quantity;
};
export class MinimumItemPurchaseCriterion
  extends ValueObject<MinimumItemPurchaseCriterionProps>
  implements IPromoCriterion<ItemPurchase>
{
  public static create(props: {
    itemId: EntityId<string>;
    minQty: Quantity;
  }): MinimumItemPurchaseCriterion {
    return new MinimumItemPurchaseCriterion(props);
  }

  check(props: ItemPurchase): boolean {
    return (
      this._value.itemId.equals(props.itemId) &&
      !this._value.minQty.gt(props.qty)
    );
  }

  get itemId() {
    return this._value.itemId;
  }

  get minQty() {
    return this._value.minQty;
  }
}

type ItemPurchaseBetweenCriterionProps = {
  itemId: EntityId<string>;
  from: Quantity;
  to: Quantity;
};
export class ItemPurchaseBetweenCriterion
  extends ValueObject<ItemPurchaseBetweenCriterionProps>
  implements IPromoCriterion<ItemPurchase>
{
  public static create(props: {
    itemId: EntityId<string>;
    from: Quantity;
    to: Quantity;
  }): ItemPurchaseBetweenCriterion {
    return new ItemPurchaseBetweenCriterion(props);
  }

  check(props: ItemPurchase): boolean {
    return (
      this._value.itemId.equals(props.itemId) &&
      !this._value.from.gt(props.qty) &&
      !props.qty.gt(this._value.to)
    );
  }

  get itemId() {
    return this._value.itemId;
  }
}

type MinimumItemTagPurchaseCriterionProps = {
  tag: Tag;
  minQty: Quantity;
  tagCriteria?: TagCriteria;
};

type TagCriterionComparatorProps = {
  tagPurchase: ItemTagPurchase;
  itemPurchase: Record<string, Omit<ItemPurchase, 'itemId'>>;
  includedTagPurchase?: ItemTagPurchase;
};

export class MinimumItemTagPurchaseCriterion
  extends ValueObject<MinimumItemTagPurchaseCriterionProps>
  implements IPromoCriterion<TagCriterionComparatorProps>
{
  public static create(props: {
    tag: Tag;
    minQty: Quantity;
    tagCriteria?: TagCriteria;
  }): MinimumItemTagPurchaseCriterion {
    return new MinimumItemTagPurchaseCriterion(props);
  }

  check(props: TagCriterionComparatorProps): boolean {
    return (
      this._value.tag.equals(props.tagPurchase.tag) &&
      this._value.minQty.lte(props.tagPurchase.qty) &&
      (this._value.tagCriteria
        ? PromoUtil.isTagCriteriaMet({
            tagCriteria: {
              ...this._value.tagCriteria,
              minQty: this._value.minQty.value,
              minUomType: UomTypeEnum.BASE,
            },
            tagPurchase: {
              qty: props.tagPurchase.qty,
              items: props.tagPurchase.items.map((item) => ({
                ...item,
                itemId: item.itemId.value,
              })),
            },
            itemsPurchase: props.itemPurchase,
            includedTagPurchase: props.includedTagPurchase
              ? {
                  qty: props.includedTagPurchase.qty,
                  items: props.includedTagPurchase.items.map((item) => ({
                    ...item,
                    itemId: item.itemId.value,
                  })),
                }
              : undefined,
          })
        : true)
    );
  }

  get tag() {
    return this._value.tag;
  }

  get tagCriteria() {
    return this._value.tagCriteria;
  }

  get minQty() {
    return this._value.minQty;
  }
}

type ItemTagPurchaseBetweenCriterionProps = {
  tag: Tag;
  from: Quantity;
  to: Quantity;
  tagCriteria?: TagCriteria;
};
export class ItemTagPurchaseBetweenCriterion
  extends ValueObject<ItemTagPurchaseBetweenCriterionProps>
  implements IPromoCriterion<TagCriterionComparatorProps>
{
  public static create(props: {
    tag: Tag;
    from: Quantity;
    to: Quantity;
    tagCriteria?: TagCriteria;
  }): ItemTagPurchaseBetweenCriterion {
    return new ItemTagPurchaseBetweenCriterion(props);
  }

  check(props: TagCriterionComparatorProps): boolean {
    return (
      this._value.tag.equals(props.tagPurchase.tag) &&
      !this._value.from.gt(props.tagPurchase.qty) &&
      !props.tagPurchase.qty.gt(this._value.to) &&
      (this._value.tagCriteria
        ? PromoUtil.isTagCriteriaMet({
            tagCriteria: {
              ...this._value.tagCriteria,
              minQty: this._value.from.value,
              minUomType: UomTypeEnum.BASE,
            },
            tagPurchase: {
              qty: props.tagPurchase.qty,
              items: props.tagPurchase.items.map((item) => ({
                ...item,
                itemId: item.itemId.value,
              })),
            },
            itemsPurchase: props.itemPurchase,
            includedTagPurchase: props.includedTagPurchase
              ? {
                  qty: props.includedTagPurchase.qty,
                  items: props.includedTagPurchase.items.map((item) => ({
                    ...item,
                    itemId: item.itemId.value,
                  })),
                }
              : undefined,
          })
        : true)
    );
  }

  get tag() {
    return this._value.tag;
  }

  get tagCriteria() {
    return this._value.tagCriteria;
  }

  get minQty() {
    return this._value.from;
  }
}

type MinimumItemPurchaseAmountCriterionProps = {
  itemId: EntityId<string>;
  minPurchase: Money;
};
export class MinimumItemPurchaseAmountCriterion
  extends ValueObject<MinimumItemPurchaseAmountCriterionProps>
  implements IPromoCriterion<ItemPurchase>
{
  public static create(props: {
    itemId: EntityId<string>;
    minPurchase: Money;
  }): MinimumItemPurchaseAmountCriterion {
    return new MinimumItemPurchaseAmountCriterion(props);
  }

  check(props: ItemPurchase): boolean {
    return (
      this._value.itemId.equals(props.itemId) &&
      props.subtotal.gte(this._value.minPurchase)
    );
  }

  get itemId() {
    return this._value.itemId;
  }

  get minPurchase() {
    return this._value.minPurchase;
  }
}

type ItemPurchaseAmountBetweenCriterionProps = {
  itemId: EntityId<string>;
  from: Money;
  to: Money;
};
export class ItemPurchaseAmountBetweenCriterion
  extends ValueObject<ItemPurchaseAmountBetweenCriterionProps>
  implements IPromoCriterion<ItemPurchase>
{
  public static create(props: {
    itemId: EntityId<string>;
    from: Money;
    to: Money;
  }): ItemPurchaseAmountBetweenCriterion {
    return new ItemPurchaseAmountBetweenCriterion(props);
  }

  check(props: ItemPurchase): boolean {
    return (
      this._value.itemId.equals(props.itemId) &&
      props.subtotal.gte(this._value.from) &&
      props.subtotal.lt(this._value.to)
    );
  }

  get itemId() {
    return this._value.itemId;
  }

  get from() {
    return this._value.from;
  }

  get to() {
    return this._value.to;
  }
}

interface IItemVoucherCriterion<TTarget, TMetCriterionProps>
  extends IPromoCriterion<TMetCriterionProps> {
  target: TTarget;
  minQty: Quantity;
  minAmount: Money;
}

type MinimumPurchaseByItemCriterionProps = {
  itemId: EntityId<string>;
  minQty: Quantity;
  minAmount: Money;
};

export class MinimumPurchaseByItemCriterion
  extends ValueObject<MinimumPurchaseByItemCriterionProps>
  implements IItemVoucherCriterion<EntityId<string>, PurchaseSummaryPerItem>
{
  public static create(
    props: MinimumPurchaseByItemCriterionProps,
  ): MinimumPurchaseByItemCriterion {
    return new MinimumPurchaseByItemCriterion(props);
  }

  check(props: PurchaseSummaryPerItem): boolean {
    return (
      props.itemId.equals(this._value.itemId) &&
      props.qty.gte(this._value.minQty) &&
      props.amount.gte(this._value.minAmount)
    );
  }

  get target(): EntityId<string> {
    return this._value.itemId;
  }

  get minQty(): Quantity {
    return this._value.minQty;
  }

  get minAmount(): Money {
    return this._value.minAmount;
  }
}

type MinimumPurchaseByTagCriterionProps = {
  tag: Tag;
  minQty: Quantity;
  minAmount: Money;
};

export class MinimumPurchaseByTagCriterion
  extends ValueObject<MinimumPurchaseByTagCriterionProps>
  implements IItemVoucherCriterion<Tag, PurchaseSummaryPerTag>
{
  public static create(
    props: MinimumPurchaseByTagCriterionProps,
  ): MinimumPurchaseByTagCriterion {
    return new MinimumPurchaseByTagCriterion(props);
  }

  check(props: PurchaseSummaryPerTag): boolean {
    return (
      props.tag.equals(this._value.tag) &&
      props.qty.gte(this._value.minQty) &&
      props.amount.gte(this._value.minAmount)
    );
  }

  get target(): Tag {
    return this._value.tag;
  }

  get minQty(): Quantity {
    return this._value.minQty;
  }

  get minAmount(): Money {
    return this._value.minAmount;
  }
}

export type Criterion =
  | MinimumItemPurchaseCriterion
  | ItemPurchaseBetweenCriterion
  | MinimumItemTagPurchaseCriterion
  | ItemTagPurchaseBetweenCriterion
  | MinimumItemPurchaseAmountCriterion
  | ItemPurchaseAmountBetweenCriterion;

export type PromoCriterionWithoutBenefit = {
  criterion: Criterion;
};

export type PromoCriterionWithBenefit = {
  criterion: Criterion;
  benefit: PromoBenefit;
};

export type PromoCriteria =
  | PromoCriterionWithBenefit[]
  | PromoCriterionWithoutBenefit[]
  | Criterion;
