import { Money } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';

import { RecommendationFilter } from '../product-catalog.constants';
import { FilterReadModel, FilterState } from '../read-models';

type PriceRange = {
  from: Money;
  to?: Money;
};

export type FilterConditionParams = Partial<{
  categoryId: number;
  brandId: number[];
  packSize: string[];
  priceRange: PriceRange[];
  variant: string[];
  recommendation: RecommendationFilter;
  isBestSeller: true;
  isLowStock: true;
  isNew: true;
  itemIds: string[];
}>;

export type GetFilterParams = {
  identity: UserIdentity;
} & FilterConditionParams;

export type GetFilterStateParams = Partial<{
  categoryId: number;
  isBestSeller: true;
  isLowStock: true;
  isNew: true;
  isSelected: true;
  isFrequentlyPurchased: true;
  isSimilar: true;
  itemIds: string[];
  isTprPromo: true;
  isActiveFlashSale: true;
  isUpcomingFlashSale: true;
}>;

export interface IFilterReadRepository {
  /**
   *
   * @param params
   */
  getFilter(params: GetFilterParams): Promise<FilterReadModel>;

  /**
   *
   */
  getFilterState(
    identity: UserIdentity,
    params: GetFilterStateParams,
  ): Promise<FilterState>;
}
