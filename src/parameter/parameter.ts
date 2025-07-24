import { IParameter, ParameterValue } from './interfaces';

export class Parameter implements IParameter {
  public readonly key: string;

  private _values: ParameterValue[];

  constructor(key: string, values?: ParameterValue[]) {
    this.key = key;
    this._values = values || [];
  }

  addValue(value: ParameterValue) {
    this._values.push(value);
  }

  get values() {
    return this._values;
  }
}
