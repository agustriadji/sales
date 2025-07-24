import { Nullable } from '@wings-corporation/core';

export interface CategoryReadModel {
  id: number;
  name: string;
  image: string;
  icon: string;
  is_delete: boolean;
  parent: Nullable<string>;
  type: string;
}
