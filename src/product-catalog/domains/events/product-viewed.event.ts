import { DomainEvent } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

import { ProductId } from '../product-id';

export type ProductViewedEventData = {
  identity: UserIdentity;
  productId: ProductId;
};

export class ProductViewed extends DomainEvent<ProductViewedEventData> {
  readonly name = 'ProductViewed';
  readonly version = 1;

  constructor(data: ProductViewedEventData) {
    super(data);
  }
}
