import { DateTime } from 'luxon';

import { Nullable } from '@wings-corporation/core';
import { ReadModel } from '@wings-online/common';

export type ProductViewReadModelProps = {
  productId: string;
  externalId: string;
  imageUrl: string;
  viewedAt: Date;
  itemName: string;
  tags: string[];
};

export type JsonProductViewProps = {
  item_id: string;
  external_id: string;
  image_url: string;
  viewed_at: number;
  item_name: string;
  promo_external_id: Nullable<string>;
};

export class ProductViewReadModel extends ReadModel {
  private promoExternalId: string | undefined;
  constructor(readonly props: ProductViewReadModelProps) {
    super();
  }

  get itemId(): string {
    return this.props.productId;
  }

  get tags(): string[] {
    return this.props.tags;
  }

  setPromoExternalId(id: string) {
    this.promoExternalId = id;
  }

  toJSON(): JsonProductViewProps {
    return {
      item_id: this.props.productId,
      external_id: this.props.externalId,
      image_url: this.props.imageUrl,
      viewed_at: DateTime.fromJSDate(this.props.viewedAt).toUnixInteger(),
      item_name: this.props.itemName,
      promo_external_id: this.promoExternalId || null,
    };
  }
}
