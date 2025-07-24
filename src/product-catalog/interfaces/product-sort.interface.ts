import { SortDirection } from '@wings-online/common';

export class ProductSortCondition {
  name?: SortDirection;
  weight?: SortDirection;
  price?: SortDirection;
  id?: string[];
  sequence?: SortDirection;
  wishlist?: string;
}
