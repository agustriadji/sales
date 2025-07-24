import { ValueObject } from '@wings-corporation/domain';

type PointConversionRateProps = {
  j: number;
  q: number;
  k: number;
};

export class PointConversionRate extends ValueObject<PointConversionRateProps> {
  private constructor(props: PointConversionRateProps) {
    super(props);
  }

  public static create(props: PointConversionRateProps): PointConversionRate {
    this.validateJackAsOne(props);
    this.validateValuesArePositive(props);
    this.validateAscendingOrder(props);

    return new PointConversionRate(props);
  }

  public static fromExpression(expression: string): PointConversionRate {
    const parts = expression.split(':');
    if (parts.length !== 3)
      throw new Error(`Invalid point conversion expression: ${expression}`);

    const values: number[] = [];

    for (const part of parts) {
      // each part must be a valid number
      if (isNaN(part as any)) {
        throw new Error(
          `Point conversion expression should be a valid number: ${part}`,
        );
      }
      values.push(Number(part));
    }

    return PointConversionRate.create({
      j: values[0],
      q: values[1],
      k: values[2],
    });
  }

  get j(): number {
    return this._value.j;
  }

  get q(): number {
    return this._value.q;
  }

  get k(): number {
    return this._value.k;
  }

  get expression(): string {
    return [this.j, this.q, this.k].join(':');
  }

  private static validateJackAsOne(props: PointConversionRateProps): void {
    if (props.j !== 1) throw new Error('Jack conversion rate must be 1');
  }

  private static validateValuesArePositive(
    props: PointConversionRateProps,
  ): void {
    if (props.j <= 0 || props.q <= 0 || props.k <= 0)
      throw new Error('Point conversion rate should be a positive number');
  }

  private static validateAscendingOrder(props: PointConversionRateProps): void {
    if (props.j > props.q || props.q > props.k)
      throw new Error('Point conversion expression should in ascending order');
  }
}
