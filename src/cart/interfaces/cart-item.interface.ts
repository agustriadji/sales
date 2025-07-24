import { Quantity } from '@wings-corporation/domain';

import { ItemId } from '../domains';

export interface CartItem {
  itemId: ItemId;
  qty: Quantity;
}
