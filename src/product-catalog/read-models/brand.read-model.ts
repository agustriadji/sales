import { Nullable } from '@wings-corporation/core';

export interface BrandReadModel {
  id: number;
  name: string;
  image: string;
  prod_heir: string;
  category_id: Nullable<number>;
  category_name: Nullable<string>;
  category_icon: Nullable<string>;
  category_image: Nullable<string>;
  category_type: Nullable<string>;
}
