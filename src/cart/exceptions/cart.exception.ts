import { DomainException } from '@wings-corporation/core';

export namespace CartException {
  export class QuantityMustBeAFactorOf extends DomainException {
    constructor(factor: number, totalQty: number) {
      super(`cart`, `qty not in factor`, {
        factor,
        total_qty: totalQty,
      });
    }
  }

  export class ItemPriceNotAvailable extends DomainException {
    constructor() {
      super('cart', 'item price not available');
    }
  }

  export class MinimumOrderNotMet extends DomainException {
    constructor() {
      super('cart', 'minimum order not met');
    }
  }

  export class PackNotSellable extends DomainException {
    constructor() {
      super('cart', 'pack not sellable');
    }
  }
}
