import { UserIdentity } from '@wings-online/common';

import { Wishlist } from '../domains';

export interface IWishlistWriteRepository {
  findById(id: string, buyerId: string): Promise<Wishlist | undefined>;
  isNameExists(buyerId: string, name: string): Promise<boolean>;
  save(wishlist: Wishlist): Promise<void>;
  delete(id: string, identity: UserIdentity): Promise<void>;
  findDefault(buyerId: string): Promise<Wishlist>;
}
