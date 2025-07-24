import { ValueObject } from '@wings-corporation/domain';

export class PackQty extends ValueObject<number> {
  private constructor(value: number) {
    super(value);
  }

  public static create(value: number): PackQty {
    if (value < 1) throw new Error('Pack qty should be at least 1');
    return new PackQty(value);
  }

  get value() {
    return this._value;
  }
}
