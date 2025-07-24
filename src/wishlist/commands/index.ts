import {
  AddWishlistItemsController,
  AddWishlistItemsHandler,
} from './add-wishlist-items';
import {
  CreateWishlistController,
  CreateWishlistHandler,
} from './create-wishlist';
import {
  DeleteWishlistController,
  DeleteWishlistHandler,
} from './delete-wishlist';
import {
  RemoveWishlistItemController,
  RemoveWishlistItemHandler,
} from './remove-wishlist-item';
import {
  RenameWishlistController,
  RenameWishlistHandler,
} from './rename-wishlist';

export const CommandHandlers = [
  CreateWishlistHandler,
  RenameWishlistHandler,
  DeleteWishlistHandler,
  AddWishlistItemsHandler,
  RemoveWishlistItemHandler,
];

export const CommandControllers = [
  CreateWishlistController,
  RenameWishlistController,
  DeleteWishlistController,
  AddWishlistItemsController,
  RemoveWishlistItemController,
];
