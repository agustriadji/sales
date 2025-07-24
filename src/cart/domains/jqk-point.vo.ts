import { ValueObject } from '@wings-corporation/domain';
import {
  JACK_POINT_TYPE,
  KING_POINT_TYPE,
  QUEEN_POINT_TYPE,
} from '@wings-online/app.constants';

import { PointType } from './point-type.vo';
import { Point } from './point.vo';

type JqkPointProps = {
  jack: Point;
  queen: Point;
  king: Point;
};

export class JqkPoint extends ValueObject<JqkPointProps> {
  private constructor(props: JqkPointProps) {
    super(props);
  }

  public static create(jack: number, queen: number, king: number): JqkPoint {
    const jackPoint = Point.create(PointType.create(JACK_POINT_TYPE), jack);
    const queenPoint = Point.create(PointType.create(QUEEN_POINT_TYPE), queen);
    const kingPoint = Point.create(PointType.create(KING_POINT_TYPE), king);

    return new JqkPoint({
      jack: jackPoint,
      queen: queenPoint,
      king: kingPoint,
    });
  }

  public static zero(): JqkPoint {
    return this.create(0, 0, 0);
  }

  get jack(): number {
    return this._value.jack.point;
  }

  get queen(): number {
    return this._value.queen.point;
  }

  get king(): number {
    return this._value.king.point;
  }
}
