import { Collection } from '@wings-corporation/core';
import { Money } from '@wings-corporation/domain';
import { CartVoucher } from '@wings-online/cart/interfaces';
import {
  CartItemReadModel,
  CartReadModel,
} from '@wings-online/cart/read-models';
import { PurchaseQtyByTag, UserIdentity } from '@wings-online/common';

import { CartType } from '../cart.constants';
import { CartQtyReadModel } from '../read-models/cart-qty.read-model';

export type GetCartItemsParams = {
  identity: UserIdentity;
  limit?: number;
  cursor?: string;
  type: CartType;
};

export interface ICartReadRepository {
  getCartInfo(
    identity: UserIdentity,
    type: CartType,
  ): Promise<CartReadModel | undefined>;
  getCartItems(
    params: GetCartItemsParams,
  ): Promise<Collection<CartItemReadModel>>;
  getCartPurchaseTags(identity: UserIdentity): Promise<PurchaseQtyByTag[]>;
  getCartVouchers(
    identity: UserIdentity,
    cartType: CartType,
  ): Promise<CartVoucher[]>;
  getCartTagsByTags(
    identity: UserIdentity,
    tags: string[],
  ): Promise<PurchaseQtyByTag[]>;

  isFreezerQualified(identity: UserIdentity): Promise<boolean>;
  getCartMinimumPurchase(
    identity: UserIdentity,
    type: CartType,
  ): Promise<Money>;

  getCartQtyByItems(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<CartQtyReadModel>;
}
