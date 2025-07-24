import { Money, ValueObject } from '@wings-corporation/domain';

export class PromoPercentage extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  public static create(value: number): PromoPercentage {
    if (value < 0)
      throw new Error('Promo percentage must be a positive number');
    if (value > 100) throw new Error('Promo percentage must not exceed 100');

    return new PromoPercentage(value);
  }

  get value(): number {
    return this._value;
  }

  calculate(price: Money): Money {
    return Money.create((price.value * this._value) / 100);
  }
}
