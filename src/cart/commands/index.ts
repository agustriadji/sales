/* istanbul ignore file */
import {
  ApplyCartVoucherController,
  ApplyCartVoucherHandler, // ApplyCartVoucherUnitOfWork,
} from './apply-cart-voucher';
import {
  BulkPutCartItemController,
  BulkPutCartItemHandler,
} from './bulk-put-cart-item';
import {
  CheckoutCartController,
  CheckoutCartHandler, // CheckoutCartUnitOfWork,
} from './checkout-cart';
import {
  ClearCartController,
  ClearCartHandler, // ClearCartUnitOfWork,
} from './clear-cart';
import {
  DeleteCartItemController,
  DeleteCartItemHandler, // DeleteCartItemUnitOfWork,
} from './delete-cart-item';
import {
  PutCartItemController,
  PutCartItemHandler, // PutCartItemUnitOfWork,
} from './put-cart-item';
import {
  UnapplyCartVoucherController,
  UnapplyCartVoucherHandler, // UnapplyCartVoucherUnitOfWork,
} from './unapply-cart-voucher';
import {
  UpdateCartAddressController,
  UpdateCartAddressHandler, // UpdateCartAddressUnitOfWork,
} from './update-cart-address';

export * from './apply-cart-voucher';
export * from './bulk-put-cart-item';
export * from './checkout-cart';
export * from './clear-cart';
export * from './delete-cart-item';
export * from './put-cart-item';
export * from './unapply-cart-voucher';
export * from './update-cart-address';

export const CommandHandlers = [
  ApplyCartVoucherHandler,
  CheckoutCartHandler,
  ClearCartHandler,
  DeleteCartItemHandler,
  PutCartItemHandler,
  UnapplyCartVoucherHandler,
  UpdateCartAddressHandler,
  BulkPutCartItemHandler,
];

export const CommandControllers = [
  ApplyCartVoucherController,
  CheckoutCartController,
  ClearCartController,
  DeleteCartItemController,
  PutCartItemController,
  UnapplyCartVoucherController,
  UpdateCartAddressController,
  BulkPutCartItemController,
];
