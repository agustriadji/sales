import { ParameterValue } from './interfaces';

export class ParameterUtils {
  public static getEffectiveParameterValue(
    values: ParameterValue[],
  ): ParameterValue | undefined {
    if (!values.length) {
      return;
    }

    const sorted = values.sort((a, b) => a.sequence - b.sequence);
    return sorted[0];
  }

  public static isParameterEffectiveByValue(
    values: ParameterValue[],
    valueToCheck: string,
  ): boolean {
    let isEffective = false;

    for (const parameterValue of values) {
      if (parameterValue.value === valueToCheck) {
        isEffective = true;
      }
      if (isEffective) break;
    }

    return isEffective;
  }

  public static getParameterByValuePrefix(
    values: ParameterValue[],
    prefix: string,
  ): ParameterValue | undefined {
    return values.find((x) =>
      x.value.toLowerCase().startsWith(prefix.toLowerCase()),
    );
  }
}
