import { Organization } from '@wings-corporation/core';

import { CategoryTypes } from '../product-catalog.constants';
import { BrandSearchReadModel } from '../read-models';
import { IOpensearchReadRepository } from './opensearch.read-repository.interface';

export type SearchBrandParams = {
  search: string;
  organization: Organization;
  categoryId?: string;
  type?: CategoryTypes;
  limit?: number;
};
export interface IBrandSearchReadRepository extends IOpensearchReadRepository {
  search(params: SearchBrandParams): Promise<BrandSearchReadModel[]>;
}
