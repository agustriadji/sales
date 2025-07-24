import { Cluster, Redis } from 'ioredis';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IoredisStore } from './ioredis.store';
import { CacheManagerOptionsProvider } from './providers/cache-manager-options.provider';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: CacheManagerOptionsProvider,
      inject: [ConfigService],
    },
    {
      provide: CACHE_MANAGER,
      useFactory: (redis: Redis | Cluster) => {
        return new IoredisStore(redis);
      },
      inject: ['REDIS_CLIENT'],
    },
  ],
  exports: [CACHE_MANAGER, 'REDIS_CLIENT'],
})
export class RedisModule {}
