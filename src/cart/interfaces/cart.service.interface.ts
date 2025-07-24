import { Division } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { CartType } from '../cart.constants';
import { CartReadModel } from '../read-models';
import { FreeProductReadModel } from '../voucher/read-models';
import { BuyerOverdue } from './overdue.interface';

export type GetTotalPriceParams = {
  identity: UserIdentity;
  cart: CartReadModel;
  division: Division;
};

export type JsonCartItemWithPriceProps = {
  id: string;
  external_id: string;
  gross_price: number;
  net_price: number;
  flash_sale_discount: number;
  regular_discount: number;
  lifetime_discount: number;
  cart_item_id: string;
};

export type GetTotalPriceResponse = {
  items: JsonCartItemWithPriceProps[];
  total_gross_price: number;
  total_net_price: number;
};

export type GetCartParams = {
  identity: UserIdentity;
  type: CartType;
};

export interface ICartService {
  getCart(params: GetCartParams): Promise<CartReadModel | undefined>;
  getSimulatedPrice(
    params: GetTotalPriceParams,
  ): Promise<GetTotalPriceResponse>;
  getOverdue(identity: UserIdentity): Promise<BuyerOverdue>;
  getFreeProducts(params: GetCartParams): Promise<FreeProductReadModel[]>;
}
