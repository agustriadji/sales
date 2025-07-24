import { Cluster, Redis } from 'ioredis';

import { ConfigService } from '@nestjs/config';

export const CacheManagerOptionsProvider = (
  configService: ConfigService,
): Redis | Cluster => {
  const redisUrl = configService.getOrThrow<string>('REDIS_URL');
  const isClusterMode = configService.get('REDIS_CLUSTER_MODE');

  let redisStore: Redis | Cluster;

  if (isClusterMode) {
    // Cluster mode: Redis URL(s) expected as comma-separated values
    const nodes = redisUrl.split(',').map((u) => {
      const url = new URL(u.trim());
      return {
        host: url.hostname,
        port: Number(url.port),
      };
    });
    redisStore = new Redis.Cluster(nodes);
  } else {
    // Standalone mode: single Redis URL
    const url = new URL(redisUrl.trim());
    redisStore = new Redis({
      host: url.hostname,
      port: Number(url.port),
    });
  }

  return redisStore;
};
