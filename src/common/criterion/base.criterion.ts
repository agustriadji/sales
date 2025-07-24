import { ValueObject } from '@wings-corporation/domain';

export abstract class Criterion<T, R> extends ValueObject<T> {
  abstract check(comparator: R): boolean;
  abstract isCriterionMet(comparator: R): boolean;
}
