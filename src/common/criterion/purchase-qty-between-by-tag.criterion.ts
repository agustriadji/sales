import { TagCriterionComparator } from '.';

import { Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';

import { TagCriteria } from '../interfaces';
import { PromoUtil, SalesUtil } from '../utils';
import { Criterion } from './base.criterion';

type PurchaseQtyBetweenByTag = {
  tag: Tag;
  from: Quantity;
  to: Quantity;
  uomType: UomType;
  tagCriteria?: TagCriteria;
};

export class PurchaseQtyBetweenByTagCriterion extends Criterion<
  PurchaseQtyBetweenByTag,
  TagCriterionComparator
> {
  constructor(
    tag: string,
    from: number,
    to: number,
    uomType: UomType,
    tagCriteria?: TagCriteria,
  ) {
    super({
      tag: Tag.fromString(tag),
      from: Quantity.create(from),
      to: Quantity.create(to),
      uomType: uomType,
      tagCriteria,
    });
  }

  public static create(
    tag: string,
    from: number,
    to: number,
    uomType: UomType,
    tagCriteria?: TagCriteria,
  ): PurchaseQtyBetweenByTagCriterion {
    return new PurchaseQtyBetweenByTagCriterion(
      tag,
      from,
      to,
      uomType,
      tagCriteria,
    );
  }

  check(comparator: TagCriterionComparator): boolean {
    return this.isCriterionMet(comparator);
  }

  isCriterionMet(comparator: TagCriterionComparator): boolean {
    const includedTagPurchase = comparator.tagPurchase.find((tag) =>
      tag.tag.equals(this.tagCriteria?.includedTag),
    );
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
        this._value.from.lte(comparatorQty) &&
        comparatorQty.lte(this._value.to) &&
        (this.tagCriteria
          ? PromoUtil.isTagCriteriaMet({
              tagCriteria: {
                ...this.tagCriteria,
                minQty: this.from.value,
                minUomType: this.uomType,
              },
              tagPurchase: value,
              itemsPurchase: comparator.itemPurchase,
              uomConversion: comparator.uomConversion,
              includedTagPurchase: includedTagPurchase,
            })
          : true)
      );
    });
  }

  get tag(): Tag {
    return this._value.tag;
  }

  get from(): Quantity {
    return this._value.from;
  }

  get to(): Quantity {
    return this._value.to;
  }

  get uomType(): UomType {
    return this._value.uomType;
  }

  get tagCriteria(): TagCriteria | undefined {
    return this._value.tagCriteria;
  }
}
