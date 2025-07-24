import { Division } from '@wings-corporation/core';

export type DeliveryAddressType = Division | 'ANY';

/**
 * The type of buyer. Same as `Division`
 */
export type BuyerType = Division;

/**
 * The type of cart. Same as `Division`
 */
export type CartType = Division;

/**
 * The type of item. Same as `Division`
 */
export type ItemType = Division;

/**
 * The minimum freezer temperature
 */
export const MINIMUM_FREEZER_TEMPERATURE = -18;

/**
 * The minimum order parameter key
 */
export const MINIMUM_ORDER_PARAMETER_KEY = {
  CUSTOMER_GROUP: 'min_order_amount_custgroup',
  AMOUNT: 'min_order_amount',
};
