import { UserIdentity } from '@wings-online/common';

import { ProductReadModel } from '../read-models';

export interface IProductCatalogService {
  /**
   *
   * @param identity
   * @param id
   */
  getProductInfo(
    identity: UserIdentity,
    id: string,
  ): Promise<ProductReadModel | undefined>;

  resolveCartQty(
    identity: UserIdentity,
    products: ProductReadModel[],
  ): Promise<void>;

  resolvePromotions(
    identity: UserIdentity,
    products: ProductReadModel[],
    isSkipFlashSale?: boolean,
  ): Promise<void>;
}
