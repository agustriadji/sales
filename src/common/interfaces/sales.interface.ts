import { PackQty } from '@wings-online/cart/domains';

import { SalesTier } from '../domains';

export interface ISalesUom {
  tier: SalesTier;
  name: string;
  qty: PackQty;
}
