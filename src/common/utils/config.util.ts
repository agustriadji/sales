import { ConfigKey } from '@wings-online/app.constants';
import { PointConfig, PointConversionRate } from '@wings-online/cart/domains';
import { Config } from '@wings-online/common';

export class ConfigUtil {
  static getValue(config: Config[], key: string): string | undefined {
    return config.find((x) => x.key === key)?.value;
  }

  private static convertToNumber(
    value: string | undefined,
  ): number | undefined {
    if (!value) return undefined;

    const result = Number(value);
    if (isNaN(result))
      throw new Error(`Config value is not a number: ${value}`);

    return result;
  }

  static getPointConfig(config: Config[]): PointConfig {
    const expression = this.getValue(
      config,
      ConfigKey.POINT_CONVERSION_EXPRESSION,
    );
    if (!expression)
      throw new Error(
        `Config ${ConfigKey.POINT_CONVERSION_EXPRESSION} is not set`,
      );

    const increments = this.convertToNumber(
      this.getValue(config, ConfigKey.POINT_INCREMENTS),
    );
    if (increments === undefined)
      throw new Error(`Config ${ConfigKey.POINT_INCREMENTS} is not set`);

    return PointConfig.create({
      increments,
      conversionRate: PointConversionRate.fromExpression(expression),
    });
  }

  static tryGetPointConfig(config: Config[]): PointConfig | undefined {
    try {
      return this.getPointConfig(config);
    } catch {
      return undefined;
    }
  }
}
