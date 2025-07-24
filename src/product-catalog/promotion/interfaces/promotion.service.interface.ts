import { UserIdentity } from '@wings-online/common';

import { ProductReadModel } from '../../read-models';

export type ApplyProductPromotionsParams = {
  identity: UserIdentity;
  products: ProductReadModel[];
};

export interface IPromotionService {
  /**
   *
   * @param params
   */
  applyProductPromotions(params: ApplyProductPromotionsParams): Promise<void>;
  applyFlashSale(params: ApplyProductPromotionsParams): Promise<void>;
}
