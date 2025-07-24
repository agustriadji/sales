export interface ProductSearchReadModel {
  id: string;
  name: string;
}

export interface SuggestProductSearchReadModel {
  is_same: boolean;
  old_search: string;
  suggested_search: string;
}
