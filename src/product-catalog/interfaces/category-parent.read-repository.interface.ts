import { UserIdentity } from '@wings-online/common';

import { CategoryParentReadModel } from '../read-models';

export interface ICategoryParentReadRepository {
  listCategoryParents(
    identity: UserIdentity,
  ): Promise<CategoryParentReadModel[]>;
}
