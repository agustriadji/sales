import { Entity, EntityId } from '@wings-corporation/domain';

import { ProductId } from './product-id';

type ProductViewProps = {
  productId: ProductId;
  viewedAt: Date;
};

type ProductViewsCreateProps = {
  productId: string;
  viewedAt?: Date;
};

export class ProductView extends Entity<ProductViewProps, string> {
  private constructor(props: ProductViewsCreateProps, id?: string) {
    super(
      {
        productId: EntityId.fromString(props.productId),
        viewedAt: props.viewedAt || new Date(),
      },
      id ? EntityId.fromString(id) : undefined,
    );
  }

  public static create(
    props: ProductViewsCreateProps,
    id?: string,
  ): ProductView {
    return new ProductView(props, id);
  }

  public markAsViewed(): void {
    this.props.viewedAt = new Date();
    this.markDirty();
  }
}
