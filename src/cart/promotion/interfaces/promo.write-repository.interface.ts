import { LoyaltyPromo } from '@wings-online/cart/promotion';
import { UserIdentity } from '@wings-online/common';

export interface IPromoWriteRepository {
  getLoyaltyPromo(identity: UserIdentity): Promise<LoyaltyPromo | undefined>;
}
