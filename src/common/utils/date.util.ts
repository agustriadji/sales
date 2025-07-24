import { DateTime } from 'luxon';

export class Dateutil {
  static getDate(
    dateStr: string | undefined,
    opts?: Partial<{ part: 'start' | 'end'; zone: string }>,
  ): Date | undefined {
    if (!dateStr) return undefined;
    const date = DateTime.fromISO(dateStr, { zone: opts?.zone });
    return opts?.part
      ? opts.part === 'start'
        ? date.startOf('day').toJSDate()
        : date.endOf('day').toJSDate()
      : date.toJSDate();
  }
}
