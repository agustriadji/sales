import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { Injectable } from '@nestjs/common';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';

import { TypeOrmPromoCMSRedemptionEntity } from '../entities';
import { IPromoCmsRedemptionWriteRepository } from '../interfaces';

@Injectable()
export class TypeOrmPromoCmsRedemptionWriteRepository
  implements IPromoCmsRedemptionWriteRepository
{
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  async insert(
    data: QueryDeepPartialEntity<TypeOrmPromoCMSRedemptionEntity>[],
  ): Promise<void> {
    if (!data.length) return;

    await this.uowService
      .getEntityManager()
      .insert(TypeOrmPromoCMSRedemptionEntity, data);
  }
}
