import * as pg from 'pg';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { XRAY_CLIENT, XRayClient } from '@wings-corporation/nest-xray';
import { ServiceReversedFQDN } from '@wings-online/app.constants';
import { TypeOrmPinoLogger } from '@wings-online/common';

import { RedisQueryResultCacheProvider } from './redis-query-result-cache.provider';

@Injectable()
export class TypeOrmModuleOptionsProvider implements TypeOrmOptionsFactory {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: TypeOrmPinoLogger,
    @Inject(XRAY_CLIENT) private readonly xray: XRayClient,
  ) {}

  async createTypeOrmOptions(): Promise<TypeOrmModuleOptions> {
    const redisUrl: string = this.config.getOrThrow('REDIS_URL');

    return {
      driver:
        this.config.get('AWS_XRAY_SDK_ENABLED') == 'true'
          ? this.xray.capturePostgres(pg)
          : pg,
      type: 'postgres',
      replication: {
        master: {
          url: this.config.getOrThrow('PG_DATABASE_WRITE_URL'),
        },
        slaves: [
          {
            url: this.config.getOrThrow('PG_DATABASE_READ_URL'),
          },
        ],
      },
      cache: {
        provider: (dataSource: DataSource) =>
          RedisQueryResultCacheProvider(dataSource, this.config),
        options: (() => {
          const isClusterMode = this.config.get('REDIS_CLUSTER_MODE');

          if (isClusterMode) {
            const urls = redisUrl.split(',').map((url) => url.trim());
            return {
              startupNodes: urls.map((urlStr) => {
                const { hostname: host, port } = new URL(urlStr);

                return {
                  host,
                  port: parseInt(port || '6379', 10),
                };
              }),

              options: {
                clusterRetryStrategy: (_times: number) => null,
                redisOptions: {
                  maxRetriesPerRequest: 0,
                },
              },
            };
          }

          const { hostname: host, port } = new URL(redisUrl);
          return {
            host,
            port: parseInt(port || '6379', 10),
          };
        })(),
      },
      extra: {
        max: this.config.getOrThrow('PG_MAX_POOL_SIZE'),
        connectionTimeoutMillis: this.config.get(
          'PG_CONNECTION_TIMEOUT_MILLIS',
        ),
        idleTimeoutMillis: this.config.get('PG_IDLE_TIMEOUT_MILLIS'),
      },
      applicationName: ServiceReversedFQDN,
      synchronize: false,
      autoLoadEntities: true,
      logger: this.logger,
      namingStrategy: new SnakeNamingStrategy(),
    };
  }
}
