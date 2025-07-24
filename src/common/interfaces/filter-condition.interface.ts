export type InFilterCondition<T = any> = {
  in: T[];
};

export type EqualsFilterCondition<T = any> = {
  equals: T;
};

export type BetweenFilterCondition<T = any> = {
  gte: T;
  lte: T;
};

export type FilterConditions = Record<string, FilterCondition>;

export type FilterCondition<T = any> = Partial<
  InFilterCondition<T> & EqualsFilterCondition<T> & BetweenFilterCondition<T>
>;

export function isEqualsFilterCondition<T = any>(
  condition: any,
): condition is EqualsFilterCondition<T> {
  return 'equals' in condition && condition.equals !== undefined;
}

export function isInFilterCondition<T = any>(
  condition: any,
): condition is InFilterCondition<T> {
  return 'in' in condition && condition.in !== undefined;
}
