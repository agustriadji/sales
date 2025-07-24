/* istanbul ignore file */
import { CartCheckedOutSubscriber } from './cart-checked-out.subscriber';
import { CartItemPriceSubscriber } from './cart-item-price.subscriber';
import { CartSimulatedSubscriber } from './cart-simulated.subscriber';

export const Subscribers = [
  CartItemPriceSubscriber,
  CartCheckedOutSubscriber,
  CartSimulatedSubscriber,
];
