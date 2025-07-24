export type ParameterValue = {
  sequence: number;
  value: string;
};

export interface IParameter {
  key: string;
  values: ParameterValue[];
}
