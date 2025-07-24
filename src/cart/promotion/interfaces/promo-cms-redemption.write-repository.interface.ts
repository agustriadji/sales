import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { TypeOrmPromoCMSRedemptionEntity } from '../entities';

export interface IPromoCmsRedemptionWriteRepository {
  insert(
    data: QueryDeepPartialEntity<TypeOrmPromoCMSRedemptionEntity>[],
  ): Promise<void>;
}
