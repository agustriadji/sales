import { UserIdentity } from '@wings-online/common';

import { ProductViewReadModel } from '../read-models/product-view.read-model';

export type FindParams = {
  identity: UserIdentity;
  categoryId?: string;
};

export interface IProductViewsReadRepository {
  find(params: FindParams): Promise<ProductViewReadModel[]>;
}
