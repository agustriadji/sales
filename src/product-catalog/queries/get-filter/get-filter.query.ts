import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';
import { RecommendationFilter } from '@wings-online/product-catalog';

type HETRange = {
  from: number;
  to?: number;
};

export class GetFilterQueryProps {
  readonly identity: UserIdentity;
  readonly categoryId?: number;
  readonly brandId: number[];
  readonly hetRange: HETRange[];
  readonly variant: string[];
  readonly packSize: string[];
  readonly recommendation?: RecommendationFilter;
  readonly isFrequentlyPurchased?: true;
  readonly isSimilar?: true;
  readonly isBestSeller?: true;
  readonly isLowStock?: true;
  readonly isNew?: true;
  readonly search?: string;
}

export class GetFilterQuery extends GetFilterQueryProps implements IQuery {
  constructor(props: GetFilterQueryProps) {
    super();
    Object.assign(this, props);
  }
}
