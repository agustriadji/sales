import { Injectable } from '@nestjs/common';
import { EntityId } from '@wings-corporation/domain';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { UserIdentity } from '@wings-online/common';

import { TypeOrmDeliveryAddressEntity } from '../entities';
import {
  DeliveryAddress,
  IBuyerWriteRepository,
  IsBuyerAddressExistsParams,
} from '../interfaces';

@Injectable()
export class TypeOrmBuyerWriteRepository implements IBuyerWriteRepository {
  constructor(private readonly uowService: TypeOrmUnitOfWorkService) {}

  async isBuyerAddressExists(
    params: IsBuyerAddressExistsParams,
  ): Promise<boolean> {
    return this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmDeliveryAddressEntity, 'deliveryAddress')
      .where('deliveryAddress.id = :deliveryAddressId', {
        deliveryAddressId: params.deliveryAddressId,
      })
      .andWhere('deliveryAddress.buyerExternalId = :buyerId', {
        buyerId: params.buyerId,
      })
      .andWhere('deliveryAddress.type IN (:...type)', {
        type: [params.type, 'ANY'],
      })
      .limit(1)
      .getExists();
  }

  async getBuyerAddresses(identity: UserIdentity): Promise<DeliveryAddress[]> {
    const { dry, frozen } = identity.division;

    const entities = await this.uowService
      .getEntityManager()
      .createQueryBuilder(TypeOrmDeliveryAddressEntity, 'deliveryAddress')
      .where('deliveryAddress.buyerExternalId = :externalId', {
        externalId: identity.externalId,
      })
      .andWhere('deliveryAddress.type IN (:...types)', {
        types: new Array('ANY')
          .concat(dry ? 'DRY' : [])
          .concat(frozen ? 'FROZEN' : []),
      })
      .getMany();

    return entities.map(({ id, label, name, address, type }) => ({
      id: EntityId.fromString(id),
      label,
      name,
      address,
      type,
    }));
  }
}
