import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';
import { Condition } from '@wings-online/product-catalog/interfaces';

export class GetProductFilterQueryProps {
  readonly identity: UserIdentity;
  readonly categoryId?: number;
  readonly search?: string;
  readonly isNew?: true;
  readonly isBestSeller?: true;
  readonly isLowStock?: true;
  readonly isSelected?: true;
  readonly isFrequentlyPurchased?: true;
  readonly isSimilar?: true;
  readonly conditions?: Condition[];
  readonly isTprPromo?: true;
  readonly isActiveFlashSale?: true;
  readonly isUpcomingFlashSale?: true;
}

export class GetProductFilterQuery
  extends GetProductFilterQueryProps
  implements IQuery
{
  constructor(props: GetProductFilterQueryProps) {
    super();
    Object.assign(this, props);
  }
}
