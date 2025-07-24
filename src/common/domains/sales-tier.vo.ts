import { ValueObject } from '@wings-corporation/domain';

export class SalesTier extends ValueObject<number> {
  private constructor(tier: number) {
    super(tier);
  }

  public static create(tier: number): SalesTier {
    return new SalesTier(tier);
  }

  public static default(): SalesTier {
    return new SalesTier(0);
  }

  get value(): number {
    return this._value;
  }
}
