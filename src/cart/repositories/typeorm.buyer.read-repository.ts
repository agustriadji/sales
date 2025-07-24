import { DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { EntityId } from '@wings-corporation/domain';
import { IBuyerReadRepository } from '@wings-online/cart/interfaces';

import { TypeOrmDeliveryAddressEntity } from '../entities';
import { GetBuyerAddressesParams } from '../interfaces/buyer.read-repository.interface';
import { DeliveryAddressReadModel } from '../read-models';

@Injectable()
export class TypeOrmBuyerReadRepository implements IBuyerReadRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getBuyerAddresses(
    params: GetBuyerAddressesParams,
  ): Promise<DeliveryAddressReadModel[]> {
    const entity = await this.dataSource
      .createEntityManager()
      .createQueryBuilder(TypeOrmDeliveryAddressEntity, 'deliveryAddress')
      .andWhere('deliveryAddress.buyerExternalId = :externalId', {
        externalId: params.buyerExternalId,
      })
      .andWhere('deliveryAddress.type IN (:...type)', {
        type: [params.type, 'ANY'],
      })
      .limit(params.limit)
      .getMany();
    return entity.map((e) => ({
      id: EntityId.fromString(e.id),
      label: e.label,
      name: e.name,
      address: e.address,
    }));
  }
}
