import { Quantity } from '@wings-corporation/domain';
import { PointConfig } from '@wings-online/cart/domains';
import { UserIdentity } from '@wings-online/common';

export interface SalesUom {
  itemId: string;
  uom: string;
  packQty: Quantity;
  tier: number;
}
export interface IConfigReadRepository {
  getPointConfig(identity: UserIdentity): Promise<PointConfig | undefined>;
  getGeneralConfig(group: string, key: string): Promise<string | undefined>;
  getSalesUoms(
    identity: UserIdentity,
    productIds: string[],
  ): Promise<SalesUom[]>;
  getCartSimulatePriceSetting(): Promise<boolean>;
}
