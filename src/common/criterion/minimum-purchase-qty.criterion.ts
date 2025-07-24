import { Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';

import { Criterion } from './base.criterion';

export type PurchaseQty = {
  qty: Quantity;
  uomType: UomType;
};

export class MinimumPurchaseQtyCriterion extends Criterion<
  PurchaseQty,
  Quantity
> {
  constructor(qty: number, uomType?: UomType) {
    super({ qty: Quantity.create(qty), uomType: uomType || UomTypeEnum.BASE });
  }

  public static create(
    qty: number,
    uomType?: UomType,
  ): MinimumPurchaseQtyCriterion {
    return new MinimumPurchaseQtyCriterion(qty, uomType);
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
    return comparator.gte(this.qty);
  }

  get qty(): Quantity {
    return this._value.qty;
  }

  get uomType(): UomType {
    return this._value.uomType;
  }
}
