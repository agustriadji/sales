import { UserIdentity } from '@wings-online/common';

import { ItemSalesUomReadModel } from '../read-models';

export interface IItemSalesUomReadRepository {
  listUoms(identity: UserIdentity): Promise<ItemSalesUomReadModel[]>;
}
