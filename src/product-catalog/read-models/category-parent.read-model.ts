import { CategoryReadModel } from './category.read-model';

export interface CategoryParentReadModel {
  name: string;
  categories: CategoryReadModel[];
}
