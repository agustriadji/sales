import { ProductSearchReadModel } from '../read-models';
import { IOpensearchReadRepository } from './opensearch.read-repository.interface';

type ProductSearchParams = {
  search: string;
  categoryId?: number;
  limit?: number;
};
export interface IProductSearchReadRepository
  extends IOpensearchReadRepository {
  search(params: ProductSearchParams): Promise<ProductSearchReadModel[]>;
}
