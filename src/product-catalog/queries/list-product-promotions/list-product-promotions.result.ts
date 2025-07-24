import { ProductPromotionReadModel } from '@wings-online/product-catalog/read-models';

export class ListProductPromotionsResult {
  readonly data: ProductPromotionReadModel;

  constructor(props: ProductPromotionReadModel) {
    this.data = props;
  }
}
