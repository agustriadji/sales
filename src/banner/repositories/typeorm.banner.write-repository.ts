import { DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { Division } from '@wings-corporation/core';

import { TypeOrmBuyerInfoEntity } from '../entities';
import { IBannerWriteRepository } from '../interfaces';

@Injectable()
export class TypeormBannerWriteRepository implements IBannerWriteRepository {
  constructor(private readonly dataSource: DataSource) {}

  async closeSuggestion(buyerId: string, type: Division): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update(TypeOrmBuyerInfoEntity)
      .set({ closeSuggestionBannerAt: new Date() })
      .where('type != :type', { type: type.toUpperCase() })
      .andWhere('buyerId = :buyerId', { buyerId })
      .execute();
  }
}
