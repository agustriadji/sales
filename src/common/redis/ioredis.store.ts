import Redis, { Cluster } from 'ioredis';

import { Injectable } from '@nestjs/common';

export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(keys: string[]): Promise<void>;
  getClient(): Redis | Cluster;
}

@Injectable()
export class IoredisStore implements CacheStore {
  constructor(private redis: Redis | Cluster) {}

  async get<T>(key: string): Promise<T | undefined> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, ttl, stringValue);
    } else {
      await this.redis.set(key, stringValue);
    }
  }

  async del(keys: string[]): Promise<void> {
    if (this.redis.isCluster) {
      await Promise.all(keys.map((k) => this.redis.del(k)));
    } else {
      await this.redis.del(keys);
    }
  }

  getClient(): Redis | Cluster {
    return this.redis;
  }
}
