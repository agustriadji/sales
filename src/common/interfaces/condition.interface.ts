import { CriteriaWithoutBenefit } from './criteria.interface';

export type ConditionType = 'AllOf' | 'OneOf';

export interface ICondition<TCriteria> {
  type: ConditionType;
  criteria: TCriteria[];
}

export interface ConditionOneOf<TCriteria> extends ICondition<TCriteria> {
  type: 'OneOf';
}

export interface ConditionAllOf<
  TCriteria extends CriteriaWithoutBenefit<any>,
  TBenefit,
> extends ICondition<TCriteria> {
  type: 'AllOf';
  benefit: TBenefit;
}
