import { Money } from '@wings-corporation/domain';

import { Criterion } from './base.criterion';

export class MinimumPurchaseAmountCriterion extends Criterion<Money, Money> {
  private constructor(amount: number) {
    super(Money.create(amount));
  }

  public static create(amount: number): MinimumPurchaseAmountCriterion {
    return new MinimumPurchaseAmountCriterion(amount);
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
    return comparator.gte(this._value);
  }

  get amount(): Money {
    return this._value;
  }
}
