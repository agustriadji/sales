import {
  ListWishlistItemsController,
  ListWishlistsItemsHandler,
} from './list-wishlist-items';
import {
  ListWishlistsController,
  ListWishlistsHandler,
} from './list-wishlists';

export const QueryHandlers = [ListWishlistsHandler, ListWishlistsItemsHandler];

export const QueryControllers = [
  ListWishlistsController,
  ListWishlistItemsController,
];
