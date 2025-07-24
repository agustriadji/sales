import { createHash } from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { DateTime } from 'luxon';

import { IIdentity } from '@wings-corporation/core';
import { MAX_CACHE_TTL_SECONDS, TIMEZONE } from '@wings-online/app.constants';

type CacheOverrides = {
  prefix?: string;
};

export class CacheUtil {
  public static getCacheKey(value: string, overrides?: CacheOverrides): string {
    const prefix = overrides?.prefix || process.env.CACHE_PREFIX;
    if (prefix) {
      return `${prefix}:${value}`;
    } else {
      return value;
    }
  }

  public static getCacheKeyByIdentity(
    key: string,
    identity: IIdentity,
  ): string {
    return this.getCacheKeyByParts([key, identity.id]);
  }

  public static getCacheKeyByParts(parts: string[]): string {
    return this.getCacheKey(parts.join(':'));
  }

  public static getMsUntilEOD(maxMs?: number): number {
    const msUntilEOD = DateTime.now()
      .setZone(TIMEZONE)
      .endOf('day')
      .diffNow().milliseconds;
    return maxMs ? Math.min(msUntilEOD, maxMs) : msUntilEOD;
  }

  public static encode(props: any): string {
    return createHash('md5').update(stringify(props)).digest('hex');
  }

  public static getDefaultTTLSeconds() {
    return Math.min(
      Math.floor(CacheUtil.getMsUntilEOD() / 1000),
      MAX_CACHE_TTL_SECONDS,
    );
  }
}
