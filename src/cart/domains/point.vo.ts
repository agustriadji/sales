import { ValueObject } from '@wings-corporation/domain';

import { PointType } from './point-type.vo';

type PointProps = {
  type: PointType;
  value: number;
};

export class Point extends ValueObject<PointProps> {
  private constructor(value: number, type: PointType) {
    super({ type, value });
  }

  public static create(type: PointType, value: number): Point {
    if (value < 0) throw new Error('Point value must be a positive number');
    return new Point(value, type);
  }

  get type(): string {
    return this._value.type.value;
  }

  get point(): number {
    return this._value.value;
  }
}
