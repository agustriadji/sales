import { PaginatedCollection } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

import { BannerReadModel } from '../read-models';

export interface ISlideReadRepository {
  listSliders(
    identity: UserIdentity,
  ): Promise<PaginatedCollection<BannerReadModel>>;
}
