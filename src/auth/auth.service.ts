import { DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { IdentityUtil, UserDivision, UserIdentity } from '@wings-online/common';
import { Nullable, Organization } from '@wings-corporation/core';

import { TypeOrmUserDefaultAddressEntity } from './entities/typeorm.user-default-address.entity';
import { TypeOrmUserInfoEntity } from './entities/typeorm.user-info.entity';
import { TypeOrmUserEntity } from './entities/typeorm.user.entity';

@Injectable()
export class AuthService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   *
   * @param externalId
   * @returns
   */
  public async getIdentityByExternalId(
    externalId: string,
  ): Promise<UserIdentity | undefined> {
    let identity: UserIdentity | undefined;

    const entity = await this.dataSource
      .createQueryBuilder(TypeOrmUserEntity, 'identity')
      .innerJoinAndSelect('identity.infos', 'infos')
      .leftJoinAndSelect('identity.defaultAddress', 'defaultAddress')
      .where('identity.externalId = :externalId', { externalId })
      //.cache(CacheUtil.getCacheKey(`user:${externalId}:identity`), ms('1h'))
      .getOne();

    if (entity) {
      const organization =
        IdentityUtil.getOrganizationFromExternalId(externalId);

      const dryInfo = entity.infos.find((info) => info.type === 'DRY');
      const frozenInfo = entity.infos.find((info) => info.type === 'FROZEN');

      const dryDivisionInfo = dryInfo
        ? this.mapToDivisionInfo(organization, dryInfo, entity.defaultAddress)
        : undefined;
      const frozenDivisionInfo = frozenInfo
        ? this.mapToDivisionInfo(
            organization,
            frozenInfo,
            entity.defaultAddress,
          )
        : undefined;

      identity = {
        id: entity.id,
        externalId: entity.externalId,
        isActive: entity.isActive,
        organization,
        division: {
          dry: dryDivisionInfo,
          frozen: frozenDivisionInfo,
          type: IdentityUtil.getDivisionType(
            dryDivisionInfo,
            frozenDivisionInfo,
          ),
        } as UserDivision,
      };
    }
    return identity;
  }

  private mapToDivisionInfo(
    organization: Organization,
    entity: TypeOrmUserInfoEntity,
    defaultAddress: Nullable<TypeOrmUserDefaultAddressEntity>,
  ) {
    return {
      group: entity.group,
      distChannel: entity.distChannel,
      salesOrg: entity.salesOrg,
      salesOffice: entity.salesOffice,
      salesGroup: entity.salesGroup,
      customerHier: entity.customerHier,
      priceListType: entity.priceListType,
      isRetailS: IdentityUtil.isRetailS(organization, entity.group),
      defaultDeliveryAddressId:
        entity.type === 'DRY'
          ? defaultAddress?.defaultDryAddressId
          : defaultAddress?.defaultFrozenAddressId,
      term: entity.term,
      payerId: entity.payerId,
      salesCode: entity.salesCode,
    };
  }
}
