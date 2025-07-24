import {
  Condition,
  FilterKey,
  IRange,
  Range,
  State,
} from '../interfaces/filter-state.interface';
import { ProductLabel } from '../product-catalog.constants';
import { FilterState } from './filter-state.read-model';

const IsRange = (value: any): value is Range => {
  return value['from'] !== undefined || value['to'] !== undefined;
};

export class FilterStateItem<T = Range | string> {
  private _parent: FilterState;
  private _key: FilterKey;
  private _value: T;
  private _label: string;
  private _state: State;
  private _conditions: Condition[];

  constructor(parent: FilterState, key: FilterKey, value: T, label?: string) {
    this._parent = parent;
    this._conditions = [];
    this._key = key;
    this._value = value;
    this._label = label ? label : IsRange(value) ? '' : (value as string);
    this._state = 'OFF';
  }

  get key() {
    return this._key;
  }

  get value() {
    return this._value;
  }

  get label() {
    return this._label;
  }

  get state() {
    return this._state;
  }

  public addCondition(condition: Condition) {
    const existingKeyCondition = this._conditions.find(
      (c) => c.key === this.key,
    );
    if (existingKeyCondition) return;

    this._conditions.push(condition);

    if (this.state === 'DISABLED') return;

    if (condition.key === this.key) {
      if (condition.key === 'HET') {
        const value = this.value as Range;
        const exists = condition.values.find(
          (range) => range.from === value.from && range.to === value.to,
        );
        if (exists) {
          this.setState('ON');
        } else {
          this.setState('OFF');
        }
      } else {
        const value = String(this.value);
        if (condition.values.includes(value)) {
          this.setState('ON');
        } else {
          this.setState('OFF');
        }
      }
    } else {
      let filtered = this._parent.items;

      for (const condition of this._conditions) {
        if (condition.key === 'HET') {
          filtered = filtered.filter((item) => {
            const het = item.het;
            return this.isWithinRange(condition.values, het);
          });
        } else if (condition.key === 'LABEL') {
          filtered = filtered.filter((item) => {
            const label = item.label;
            return condition.values.some((v) =>
              label.includes(v as ProductLabel),
            );
          });
        } else {
          filtered = filtered.filter((item) => {
            const value =
              condition.key === 'BRAND'
                ? item.brandId
                : item[condition.key.toLowerCase()];
            return condition.values.includes(value);
          });
        }
      }

      this.setState('DISABLED');

      for (const item of filtered) {
        if (this.key === 'HET') {
          const het = item.het;
          const value = this._value as Range;
          if (this.isWithinRange([value], het)) {
            this.setState('OFF');
          }
        } else if (this.key === 'LABEL') {
          const value = this._value;

          if (item.label.includes(value as ProductLabel)) {
            this.setState('OFF');
          }
        } else {
          const key = this.key === 'BRAND' ? 'brandId' : this.key.toLowerCase();
          if (item[key] === this.value) {
            this.setState('OFF');
          }
        }
      }
    }
  }

  private isWithinRange(ranges: Range[], value: number): boolean {
    return ranges.some((range) => {
      if (range.from && range.to) {
        return range.from <= value && range.to >= value;
      } else if (range.from) {
        return range.from <= value;
      } else if (range.to) {
        return range.to >= value;
      } else {
        return false;
      }
    });
  }

  setState(state: State) {
    this._state = state;
  }

  toJSON(): JsonFilterStateItemProps {
    return {
      value:
        this._key !== 'HET'
          ? (this._value as string)
          : {
              from: (this._value as Range).from,
              to: (this._value as Range).to,
            },
      label: this._label,
      state: this._state,
    };
  }
}

export type JsonFilterStateItemProps = {
  value: string | IRange<number>;
  label?: string;
  state: State;
};
