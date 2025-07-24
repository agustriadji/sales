import { ProductLabel } from '../product-catalog.constants';

export type FilterItemSource = {
  brandId: string;
  brandDescription: string;
  variant: string;
  size: string;
  het: number;
  label: ProductLabel[];
};

export type FilterKey = 'BRAND' | 'VARIANT' | 'SIZE' | 'HET' | 'LABEL';
export type State = 'ON' | 'OFF' | 'DISABLED';

export interface ICondition {
  key: FilterKey;
  values: any;
}

export interface MultiValueCondition extends ICondition {
  key: 'BRAND' | 'VARIANT' | 'SIZE' | 'LABEL';
  values: string[];
}

export interface RangeCondition extends ICondition {
  key: 'HET';
  values: Range[];
}

export type Condition = RangeCondition | MultiValueCondition;

export type FilterCondition = Condition[];

export type Range = FromRange | BetweenRange | ToRange;

export interface IRange<T> {
  from?: T;
  to?: T;
}

export interface BetweenRange extends IRange<number> {
  from: number;
  to: number;
}

export interface FromRange extends IRange<number> {
  from: number;
}

export interface ToRange extends IRange<number> {
  to: number;
}
