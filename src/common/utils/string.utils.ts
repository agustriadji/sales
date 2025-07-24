import { DateTime } from 'luxon';

import { LEGACY_ORDER_DEFAULT_TIMEZONE } from '@wings-online/app.constants';

export class StringUtils {
  private static tryParseNumber(value: string): number | string {
    const tryParse = Number(value);
    return !isNaN(tryParse) ? tryParse : value;
  }

  private static tryParseDate(value: any): Date | string {
    const date = DateTime.fromFormat(value.toString(), 'yyyy-LL-dd', {
      zone: LEGACY_ORDER_DEFAULT_TIMEZONE,
    });
    return date.isValid ? date.toJSDate() : value;
  }

  static tryParse(value: string): number | string | Date {
    let result: number | string | Date = value;
    result = this.tryParseNumber(result);
    result = this.tryParseDate(result);
    return result;
  }
}
