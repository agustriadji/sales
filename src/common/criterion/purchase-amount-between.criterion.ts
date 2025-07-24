import { Money } from '@wings-corporation/domain';

import { Criterion } from './base.criterion';

type PurchaseAmountBetween = {
  from: Money;
  to: Money;
};

export class PurchaseAmountBetweenCriterion extends Criterion<
  PurchaseAmountBetween,
  Money
> {
  constructor(from: number, to: number) {
    super({ from: Money.create(from), to: Money.create(to) });
  }

  public static create(
    from: number,
    to: number,
  ): PurchaseAmountBetweenCriterion {
    return new PurchaseAmountBetweenCriterion(from, to);
  }

  /**
   * @deprecated
   * @param comparator
   * @returns
   */
  check(comparator: Money): boolean {
    return this.isCriterionMet(comparator);
  }

  isCriterionMet(comparator: Money): boolean {
    return !this._value.from.gt(comparator) && this._value.to.gt(comparator);
  }

  get from(): Money {
    return this._value.from;
  }

  get to(): Money {
    return this._value.to;
  }
}
