import { PurchaseQtyByTag, UserIdentity } from '@wings-online/common';

import { CartType } from '../cart.constants';
import { CartAggregate } from '../domains';

export interface ICartWriteRepository {
  /**
   * Retrieves a Cart Aggregate
   * @param buyerId Id of Buyer
   */
  getBuyerCart(
    identity: UserIdentity,
    type: CartType,
  ): Promise<CartAggregate | undefined>;
  /**
   * Retrieves a Cart Aggregates
   * @param identity Identity of the user
   */
  getBuyerCarts(identity: UserIdentity): Promise<CartAggregate[]>;
  /**
   *
   * @param identity
   * @param tags
   * @returns
   */
  getCartTagsByTags(
    identity: UserIdentity,
    tags: string[],
  ): Promise<PurchaseQtyByTag[]>;

  /**
   * Saves a cart aggregate into persistant storage
   * @param cart Cart Aggregate
   */
  save(cart: CartAggregate): Promise<void>;
}
