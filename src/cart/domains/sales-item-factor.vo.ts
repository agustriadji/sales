import { ValueObject } from '@wings-corporation/domain';
import { SalesTier } from '@wings-online/common';

import { SalesFactor } from './sales-factor.vo';

export type SalesItemFactorProps = {
  tier: SalesTier;
  salesFactor: SalesFactor;
};

export class SalesItemFactor extends ValueObject<SalesItemFactorProps> {
  private constructor(props: SalesItemFactorProps) {
    super(props);
  }

  public static create(
    tier: SalesTier,
    salesFactor: SalesFactor,
  ): SalesItemFactor {
    return new SalesItemFactor({ tier, salesFactor });
  }

  get tier(): number {
    return this._value.tier.value;
  }

  get salesFactor(): number {
    return this._value.salesFactor.value;
  }
}
