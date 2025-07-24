import { ValueObject } from '@wings-corporation/domain';

export class PurchasePoint extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  public static create(point: number): PurchasePoint {
    if (point < 0) throw new Error('Purchase point must be minimum 0');
    return point == 0 ? PurchasePoint.zero() : new PurchasePoint(point);
  }

  public static zero(): PurchasePoint {
    return new PurchasePoint(0);
  }

  get value() {
    return this._value;
  }
}
