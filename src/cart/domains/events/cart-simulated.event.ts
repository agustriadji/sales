import { DomainEvent } from '@wings-corporation/domain';

export type CartSimulatedEventData = {
  id: string;
  items: Array<{
    id: string;
    subtotal: number;
    total: number;
    flashSaleDiscount: number;
    regularDiscount: number;
    lifetimeDiscount: number;
  }>;
};

export class CartSimulated extends DomainEvent<CartSimulatedEventData> {
  readonly name = 'CartSimulated';
  readonly version = 1;

  constructor(data: CartSimulatedEventData) {
    super(data);
  }
}
