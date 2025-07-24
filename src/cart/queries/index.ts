import { GetCartInfoController, GetCartInfoHandler } from './get-cart-info';
import {
  GetCartSimulatedPriceController,
  GetCartSimulatedPriceHandler,
} from './get-cart-simulated-price';
import {
  ListCartItemsController,
  ListCartItemsHandler,
} from './list-cart-items';
import {
  ListFreeProductsController,
  ListFreeProductsHandler,
} from './list-free-products';
import { ListVouchersController, ListVouchersHandler } from './list-vouchers';

/* istanbul ignore file */
export * from './get-cart-info';
export * from './list-cart-items';
export * from './list-vouchers';

export const QueryHandlers = [
  ListCartItemsHandler,
  GetCartInfoHandler,
  GetCartSimulatedPriceHandler,
  ListVouchersHandler,
  ListFreeProductsHandler,
];

export const QueryControllers = [
  ListCartItemsController,
  GetCartInfoController,
  GetCartSimulatedPriceController,
  ListVouchersController,
  ListFreeProductsController,
];
