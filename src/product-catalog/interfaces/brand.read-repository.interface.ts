import { UserIdentity } from '@wings-online/common';

import { CategoryTypes } from '../product-catalog.constants';
import { BrandReadModel } from '../read-models/brand.read-model';

export type GetBrandItems = {
  identity: UserIdentity;
  type?: CategoryTypes;
  ids?: string[];
  limit?: number;
  useCache?: boolean;
};

type TagBrands = Map<string, Set<string>>;

export interface IBrandReadRepository {
  listBrands(params: GetBrandItems): Promise<BrandReadModel[]>;
  getTagBrands(
    tags: string[],
    identity: UserIdentity,
  ): TagBrands | Promise<TagBrands>;
}
