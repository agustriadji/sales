import { DataSource } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { KeyUtil } from '@wings-corporation/utils';
import { UserIdentity } from '@wings-online/common';

import { TypeOrmItemSalesUomEntity } from '../entities';
import { IItemSalesUomReadRepository } from '../interfaces';
import { ItemSalesUomReadModel } from '../read-models';

@Injectable()
export class TypeormItemSalesUomReadRepository
  implements IItemSalesUomReadRepository
{
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async listUoms(identity: UserIdentity): Promise<ItemSalesUomReadModel[]> {
    return await this.dataSource
      .createQueryBuilder(TypeOrmItemSalesUomEntity, 'salesUom')
      .where('salesUom.slsOffice in (:...slsOffice)', {
        slsOffice: KeyUtil.getSalesUomKeys(identity),
      })
      .orderBy('salesUom.tier', 'DESC')
      .getMany();
  }
}
