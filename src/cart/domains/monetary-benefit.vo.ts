import { Money, Quantity, ValueObject } from '@wings-corporation/domain';
import { BenefitType } from '@wings-online/common';

import { PromoPercentage } from './promo-percentage.vo';

type MonetaryBenefitValue = Money | PromoPercentage;

export class MonetaryBenefit extends ValueObject<MonetaryBenefitValue> {
  private constructor(props: MonetaryBenefitValue) {
    super(props);
  }

  public static create(props: MonetaryBenefitValue) {
    return new MonetaryBenefit(props);
  }

  get type(): BenefitType {
    return this._value instanceof Money ? 'AMOUNT' : 'PERCENTAGE';
  }

  get value(): number {
    return this._value.value;
  }

  calculate(price: Money, purchaseQty: Quantity = Quantity.create(1)): Money {
    if (price.equals(Money.zero())) return Money.zero();

    if (this._value instanceof Money) {
      return this._value.multiply(purchaseQty);
    } else {
      return this._value.calculate(price).multiply(purchaseQty);
    }
  }
}
