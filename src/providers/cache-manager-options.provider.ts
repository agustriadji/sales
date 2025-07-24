import Keyv from 'keyv';

import KeyvRedis, { createCluster, createKeyv } from '@keyv/redis';
import { CacheManagerOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { MAX_CACHE_TTL_SECONDS } from '@wings-online/app.constants';
import { CacheUtil } from '@wings-online/common';

export const CacheManagerOptionsProvider = (
  configService: ConfigService,
): CacheManagerOptions => {
  const redisUrl = configService.getOrThrow<string>('REDIS_URL');
  const isClusterMode = configService.get('REDIS_CLUSTER_MODE');

  let redisStore: Keyv;

  if (isClusterMode) {
    // Cluster mode: Redis URL(s) expected as comma-separated values
    const urls = redisUrl.split(',').map((url) => ({ url: url.trim() }));
    const cluster = createCluster({ rootNodes: urls });
    redisStore = new Keyv({ store: new KeyvRedis(cluster) });
  } else {
    // Standalone mode: single Redis URL
    redisStore = createKeyv(redisUrl);
  }

  return {
    stores: [redisStore],
    ttl: CacheUtil.getMsUntilEOD(MAX_CACHE_TTL_SECONDS * 1000),
  };
};
