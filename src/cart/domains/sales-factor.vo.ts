import { ValueObject } from '@wings-corporation/domain';

export class SalesFactor extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  public static create(value: number): SalesFactor {
    if (value < 1) throw new Error('Sales factor should be at least 1');
    return new SalesFactor(value);
  }

  get value() {
    return this._value;
  }
}
