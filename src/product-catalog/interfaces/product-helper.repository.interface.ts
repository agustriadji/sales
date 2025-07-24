import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

import { UserIdentity } from '@wings-online/common';

import { TypeOrmItemEntity } from '../entities';

export interface IProductHelperRepository {
  /**
   *
   * @param identity
   */
  getValidProductQuery(
    identity: UserIdentity,
  ): SelectQueryBuilder<TypeOrmItemEntity>;

  joinPromoTPRQuery<T extends ObjectLiteral>(
    query: SelectQueryBuilder<T>,
    identity: UserIdentity,
    itemAlias?: string,
    salesConfigAlias?: string,
  ): SelectQueryBuilder<T>;
}
