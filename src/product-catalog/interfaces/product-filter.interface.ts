import { FilterCondition } from '@wings-online/common';

export class ProductFilterCondition {
  brandId?: FilterCondition<number>;
  variant?: FilterCondition<string>;
  packSize?: FilterCondition<string>;
  het?: FilterCondition<string>;
  label?: FilterCondition<any>;
  id?: FilterCondition<string>;
  categoryId?: FilterCondition<number>;
  tag?: FilterCondition<string>;
  onlyTPR?: boolean;
}
