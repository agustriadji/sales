import { DataSource } from 'typeorm';
import { RedisQueryResultCache as BaseRedisQueryResultCache } from 'typeorm/cache/RedisQueryResultCache';

import { ConfigService } from '@nestjs/config';

type ClientType = 'ioredis/cluster' | 'ioredis';

export class RedisQueryResultCache extends BaseRedisQueryResultCache {
  constructor(dataSource: DataSource, clientType: ClientType) {
    super(dataSource, clientType);
  }

  get isClusterMode(): boolean {
    return this.clientType === 'ioredis/cluster';
  }

  /**
   * Removes all cached results by given identifiers from cache.
   * Supports both exact matches and pattern-based deletion.
   */
  async remove(identifiers: string[]): Promise<void> {
    await Promise.all(
      identifiers.map(async (identifier) => {
        if (identifier.includes('*')) {
          return this.deleteByPattern(identifier);
        }
        return this.deleteKey(identifier);
      }),
    );
  }

  /**
   * Removes all keys that match the given pattern from Redis.
   * @param pattern The pattern to match keys against.
   */
  private async deleteByPattern(pattern: string): Promise<void> {
    if (this.isClusterMode) {
      const masters = this.client.nodes('master');
      const allKeysToDelete: string[] = [];

      for (const node of masters) {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await node.scan(
            cursor,
            'MATCH',
            pattern,
            'COUNT',
            1000,
          );
          if (keys.length > 0) {
            allKeysToDelete.push(...keys);
          }
          cursor = nextCursor;
        } while (cursor !== '0');
      }

      if (allKeysToDelete.length > 0) {
        // const deletePromises = allKeysToDelete.map((key) =>
        //   this.client.del(key),
        // );

        const batchSize = 100;
        for (let i = 0; i < allKeysToDelete.length; i += batchSize) {
          const batch = allKeysToDelete.slice(i, i + batchSize);
          const deletePromises = batch.map((key) => this.client.del(key));
          await Promise.all(deletePromises);
        }
        // await Promise.all(deletePromises);
      }
    } else {
      // await this.client.keys(pattern, (err: Error | null, keys: string[]) => {
      //   if (err) throw err;
      //   if (!keys || keys.length === 0) return;
      //   this.client.del(keys, (delErr: Error | null) => {
      //     if (delErr) throw delErr;
      //   });
      // });

      const stream = this.client.scanStream({
        match: pattern,
        count: 1000,
      });

      const keysToDelete: string[] = [];

      stream.on('data', (keys: string[]) => {
        keysToDelete.push(...keys);
      });

      stream.on('end', async () => {
        if (keysToDelete.length > 0) {
          // Process deletions in batches
          const batchSize = 100;
          for (let i = 0; i < keysToDelete.length; i += batchSize) {
            const batch = keysToDelete.slice(i, i + batchSize);
            await this.client.del(...batch);
          }
        }
      });
    }
  }
}

export const RedisQueryResultCacheProvider = (
  dataSource: DataSource,
  config: ConfigService,
) => {
  const clientType = config.get('REDIS_CLUSTER_MODE')
    ? 'ioredis/cluster'
    : 'ioredis';
  return new RedisQueryResultCache(dataSource, clientType);
};
