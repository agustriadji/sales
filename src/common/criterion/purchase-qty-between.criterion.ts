import { Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';

import { Criterion } from './base.criterion';

type PurchaseQtyBetween = {
  from: Quantity;
  to: Quantity;
  uomType: UomType;
};

export class PurchaseQtyBetweenCriterion extends Criterion<
  PurchaseQtyBetween,
  Quantity
> {
  constructor(from: number, to: number, uomType?: UomType) {
    super({
      from: Quantity.create(from),
      to: Quantity.create(to),
      uomType: uomType || UomTypeEnum.BASE,
    });
  }

  public static create(
    from: number,
    to: number,
    uomType?: UomType,
  ): PurchaseQtyBetweenCriterion {
    return new PurchaseQtyBetweenCriterion(from, to, uomType);
  }

  /**
   * @deprecated
   * @param comparator
   * @returns
   */
  check(comparator: Quantity): boolean {
    return this.isCriterionMet(comparator);
  }

  isCriterionMet(comparator: Quantity): boolean {
    return this._value.from.lte(comparator) && comparator.lte(this._value.to);
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
}
