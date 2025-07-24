import { UserIdentity } from '@wings-online/common';

import { ProductViews } from '../domains';

export interface IProductViewsWriteRepository {
  find(identity: UserIdentity): Promise<ProductViews>;
  save(views: ProductViews): Promise<void>;
}
