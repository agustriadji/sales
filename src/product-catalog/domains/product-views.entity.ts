import { Entity, EntityId } from '@wings-corporation/domain';

import { MAX_PRODUCT_VIEW_LENGTH } from '../product-catalog.constants';
import { ProductView } from './product-view.entity';

type ProductViewsProps = {
  maxViews: number;
  views: ProductView[];
  removedViews: ProductView[];
};

type ProductViewsCreateProps = {
  maxViews?: number;
  views?: ProductView[];
};

export class ProductViews extends Entity<ProductViewsProps, string> {
  private constructor(props: ProductViewsCreateProps, id?: string) {
    super(
      {
        views: props.views || [],
        maxViews: props.maxViews || MAX_PRODUCT_VIEW_LENGTH,
        removedViews: [],
      },
      id ? EntityId.fromString(id) : undefined,
    );
  }

  public static create(
    props: ProductViewsCreateProps,
    id?: string,
  ): ProductViews {
    return new ProductViews(props, id);
  }

  public addView(productId: string): void {
    // find existing views
    const existing = this.props.views.find((x) =>
      x.props.productId.equals(EntityId.fromString(productId)),
    );
    if (existing) {
      existing.markAsViewed();
    } else {
      const view = ProductView.create({ productId });
      this.props.views.unshift(view);
    }

    // ensure that views are sorted descending
    this.props.views = this.props.views.sort(
      (a, b) => b.props.viewedAt.getTime() - a.props.viewedAt.getTime(),
    );

    // ensure that views within max allowed
    if (this.props.views.length > this.props.maxViews) {
      this.removeView(this.props.views.pop()!);
    }
  }

  private removeView(view: ProductView): void {
    this.props.removedViews.push(view);
  }
}
