import { ValueObject } from '@wings-corporation/domain';

import { PointConversionRate } from './point-conversion-rate.vo';

type PointConfigProps = {
  increments: number;
  conversionRate: PointConversionRate;
};

export class PointConfig extends ValueObject<PointConfigProps> {
  private constructor(props: PointConfigProps) {
    super(props);
  }

  public static create(props: PointConfigProps): PointConfig {
    if (props.increments <= 0) {
      throw new Error('Increments must be greater than zero');
    }

    return new PointConfig(props);
  }

  get increments(): number {
    return this._value.increments;
  }

  get conversionRate(): PointConversionRate {
    return this._value.conversionRate;
  }
}
