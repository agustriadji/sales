import { Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';

import { TagCriteria, UomConversion } from '../interfaces';
import { PromoUtil, SalesUtil } from '../utils';
import { Criterion } from './base.criterion';

type PurchaseQtyByTagCriterion = {
  tag: Tag;
  qty: Quantity;
  uomType: UomType;
  tagCriteria?: TagCriteria;
};

export type PurchaseQtyByTag = {
  tag: Tag;
  qty: Quantity;
  items: Array<{
    itemId: string;
    qty: Quantity;
    qtyIntermediate: Quantity;
    qtyPack: Quantity;
    addedAt: Date;
  }>;
};

type ItemId = string;
type PurchaseQtyByItem = Record<
  ItemId,
  { qty: Quantity; qtyIntermediate: Quantity; qtyPack: Quantity }
>;

export type TagCriterionComparator = {
  tagPurchase: PurchaseQtyByTag[];
  itemPurchase: PurchaseQtyByItem;
  uomConversion: UomConversion;
};

export class MinimumPurchaseQtyByTagCriterion extends Criterion<
  PurchaseQtyByTagCriterion,
  TagCriterionComparator
> {
  constructor(
    tag: string,
    minQty: number,
    minUomType: UomType,
    tagCriteria?: TagCriteria,
  ) {
    super({
      tag: Tag.fromString(tag),
      qty: Quantity.create(minQty),
      uomType: minUomType,
      tagCriteria,
    });
  }

  public static create(
    tag: string,
    minQty: number,
    minUomType: UomType,
    tagCriteria?: TagCriteria,
  ): MinimumPurchaseQtyByTagCriterion {
    return new MinimumPurchaseQtyByTagCriterion(
      tag,
      minQty,
      minUomType,
      tagCriteria,
    );
  }

  /**
   * @deprecated
   * @param comparator
   * @returns
   */
  check(comparator: TagCriterionComparator): boolean {
    return this.isCriterionMet(comparator);
  }

  isCriterionMet(comparator: TagCriterionComparator): boolean {
    const includedTag = this.tagCriteria?.includedTag
      ? comparator.tagPurchase.find((tag) =>
          tag.tag.equals(this.tagCriteria!.includedTag),
        )
      : undefined;

    return comparator.tagPurchase.some((value) => {
      let comparatorQty = Quantity.create(0);

      if (this.uomType === UomTypeEnum.BASE) {
        comparatorQty = value.qty;
      } else if (this.uomType === UomTypeEnum.INTERMEDIATE) {
        comparatorQty = SalesUtil.getQtyInIntermediate(
          value.qty,
          comparator.uomConversion.base,
        );
      } else {
        comparatorQty = SalesUtil.getQtyInPack(
          value.qty,
          comparator.uomConversion.pack,
        );
      }

      return (
        value.tag.equals(this._value.tag) &&
        comparatorQty.gte(this._value.qty) &&
        (this.tagCriteria
          ? PromoUtil.isTagCriteriaMet({
              tagCriteria: {
                ...this.tagCriteria,
                minQty: this._value.qty.value,
                minUomType: this._value.uomType,
              },
              tagPurchase: value,
              itemsPurchase: comparator.itemPurchase,
              uomConversion: comparator.uomConversion,
              includedTagPurchase: includedTag,
            })
          : true)
      );
    });
  }

  get tag(): Tag {
    return this._value.tag;
  }

  get qty(): Quantity {
    return this._value.qty;
  }

  get uomType(): UomType {
    return this._value.uomType;
  }

  get tagCriteria(): TagCriteria | undefined {
    return this._value.tagCriteria;
  }
}
