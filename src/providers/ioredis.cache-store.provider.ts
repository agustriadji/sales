import Redis, { Cluster } from 'ioredis';

import { Injectable } from '@nestjs/common';

interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  reset(): Promise<void>;
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

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async reset(): Promise<void> {
    // Note: flushdb doesn't work in cluster mode
    // You'd need to iterate through nodes
    if (this.redis instanceof Cluster) {
      await Promise.all(
        this.redis.nodes('master').map((node) => node.flushdb()),
      );
    } else {
      await this.redis.flushdb();
    }
  }

  getClient(): Redis | Cluster {
    return this.redis;
  }
}
