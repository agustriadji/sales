import { Collection, PaginatedCollection } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';
import { ProductReadModel } from '@wings-online/product-catalog/read-models';

import { WishlistId } from '../domains';
import { WishlistReadModel } from '../read-models';

export type GetWishlistsParams = {
  identity: UserIdentity;
  limit: number;
  cursor?: string;
};

export type GetWishlistItemsParams = {
  id: WishlistId;
  identity: UserIdentity;
  page?: number;
  pageSize?: number;
};

export interface IWishlistReadRepository {
  getWishlists(
    params: GetWishlistsParams,
  ): Promise<Collection<WishlistReadModel>>;
  getWishlistItems(
    params: GetWishlistItemsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;
}
