import { UserIdentity } from '@wings-online/common';

import { CategoryReadModel } from '../read-models/category.read-model';
import { CategorySortCondition } from './category-sort.interface';

export interface ICategoryReadRepository {
  listCategories(params: {
    identity: UserIdentity;
    sort?: CategorySortCondition;
  }): Promise<CategoryReadModel[]>;
}
