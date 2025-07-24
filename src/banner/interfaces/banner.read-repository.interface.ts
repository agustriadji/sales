import {
  IPage,
  PaginatedCollection,
  WithIdentity,
} from '@wings-corporation/core';
import { SuggestionBannerReadModel } from '@wings-online/banner/read-models';
import { UserIdentity } from '@wings-online/common';

import { BannerReadModel } from '../read-models';
import { BannerFilterCondition } from './banner-filter.interface';

export type GetBannersParams = Partial<IPage> &
  WithIdentity<UserIdentity> & {
    identity: UserIdentity;
    filter?: BannerFilterCondition;
  };

export interface IBannerReadRepository {
  getBanners(
    params: GetBannersParams,
  ): Promise<PaginatedCollection<BannerReadModel>>;
  getClusteringBannerIds(
    identity: UserIdentity,
    feature: string,
  ): Promise<string[]>;
  getSuggestion(identity: UserIdentity): Promise<SuggestionBannerReadModel>;
}
