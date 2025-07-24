import { UserIdentity } from '@wings-online/common';
import {
  FlashSaleReadModel,
  PromotionReadModel,
} from '@wings-online/product-catalog/read-models';

import { FlashSaleStatus } from '../promotion.constants';

export type GetFlashSaleItemParams = {
  identity: UserIdentity;
  itemIds?: string[];
  status?: FlashSaleStatus;
};

export interface IPromoReadRepository {
  getFlashSaleItems(
    params: GetFlashSaleItemParams,
  ): Promise<FlashSaleReadModel[]>;

  listProductsPromotions(
    identity: UserIdentity,
    productIds: string[],
    tags: string[],
  ): Promise<PromotionReadModel[]>;

  listProductsRegularPromotions(
    identity: UserIdentity,
    productIds: string[],
    tags: string[],
  ): Promise<PromotionReadModel[]>;
}
