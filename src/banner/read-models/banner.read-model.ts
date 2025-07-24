import { Division, Nullable } from '@wings-corporation/core';
import { ReadModel } from '@wings-online/common';
import { ProductId } from '@wings-online/product-catalog/domains';

import { BannerId } from '../domains';

type BannerReadModelProps = {
  id: BannerId;
  name: string;
  image: string;
  productId: Nullable<ProductId>;
  productExternalId: Nullable<string>;
  categoryId: Nullable<number>;
  brandId: Nullable<number>;
  page: string;
  categoryName: Nullable<string>;
  brandName: Nullable<string>;
  categoryIcon: Nullable<string>;
  categoryImage: Nullable<string>;
  flashSaleId: Nullable<string>;
  regularPromoId: Nullable<string>;
  type: Division;
  sequence: number;
  missionId?: Nullable<number>;
};

export type JsonBannerProps = {
  id: number;
  name: string;
  image: string;
  product_id: Nullable<string>;
  product_external_id: Nullable<string>;
  category_id: Nullable<number>;
  brand_id: Nullable<number>;
  page: string;
  category_name: Nullable<string>;
  brand_name: Nullable<string>;
  category_icon: Nullable<string>;
  category_image: Nullable<string>;
  flash_sale_id: Nullable<string>;
  regular_promo_id: Nullable<string>;
  mission_id: Nullable<number>;
};

export class BannerReadModel extends ReadModel {
  constructor(private readonly props: BannerReadModelProps) {
    super();
  }

  get type(): Division {
    return this.props.type;
  }

  get sequence(): number {
    return this.props.sequence;
  }

  toJSON(): JsonBannerProps {
    return {
      id: this.props.id.value,
      name: this.props.name,
      image: this.props.image,
      product_id: this.props.productId?.value || null,
      product_external_id: this.props.productExternalId,
      category_id: this.props.categoryId,
      brand_id: this.props.brandId,
      page: this.props.page,
      category_name: this.props.categoryName,
      brand_name: this.props.brandName,
      category_icon: this.props.categoryIcon,
      category_image: this.props.categoryImage,
      flash_sale_id: this.props.flashSaleId,
      regular_promo_id: this.props.regularPromoId,
      mission_id: this.props.missionId || null,
    };
  }
}
