import { Money, ValueObject } from '@wings-corporation/domain';
import { SalesTier } from '@wings-online/common';

export type SalesItemPriceProps = {
  tier: SalesTier;
  price: Money;
};

export class SalesItemPrice extends ValueObject<SalesItemPriceProps> {
  private constructor(props: SalesItemPriceProps) {
    super(props);
  }

  public static create(tier: SalesTier, price: Money): SalesItemPrice {
    return new SalesItemPrice({ tier, price });
  }

  get tier(): number {
    return this._value.tier.value;
  }

  get price(): number {
    return this._value.price.value;
  }
}
