import { ValueObject } from '@wings-corporation/domain';
import {
  JACK_POINT_TYPE,
  KING_POINT_TYPE,
  QUEEN_POINT_TYPE,
} from '@wings-online/app.constants';

export class PointType extends ValueObject<string> {
  private constructor(name: string) {
    super(name);
  }

  public static create(name: string): PointType {
    return new PointType(name);
  }

  public static jack(): PointType {
    return new PointType(JACK_POINT_TYPE);
  }

  public static queen(): PointType {
    return new PointType(QUEEN_POINT_TYPE);
  }

  public static king(): PointType {
    return new PointType(KING_POINT_TYPE);
  }

  get value(): string {
    return this._value;
  }
}
