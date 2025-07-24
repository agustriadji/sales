import { UserIdentity } from '@wings-online/common';

import { CategorySequenceReadModel } from '../read-models';

export interface ICategorySequenceReadRepository {
  getCustomerCategorySequence(
    identity: UserIdentity,
  ): Promise<CategorySequenceReadModel | undefined>;
}
