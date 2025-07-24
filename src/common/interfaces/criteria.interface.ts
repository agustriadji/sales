import { Criterion } from '../criterion';

export interface CriteriaWithBenefit<
  C extends Criterion<T, R>,
  B,
  T = any,
  R = any,
> {
  criterion: C;
  benefit: B;
}

export type CriteriaWithoutBenefit<
  C extends Criterion<T, R>,
  T = any,
  R = any,
> = Omit<CriteriaWithBenefit<C, never, T, R>, 'benefit'>;
