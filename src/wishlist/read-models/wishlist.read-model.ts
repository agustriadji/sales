import { ReadModel } from '@wings-online/common';

import { WishlistId } from '../domains';

type WishlistReadModelProps = {
  id: WishlistId;
  name: string;
  totalItems: number;
  images: string[];
  isDefault: boolean;
};

export type JsonWishlistProps = {
  id: string;
  name: string;
  total_items: number;
  images: string[];
  is_default: boolean;
};

export class WishlistReadModel extends ReadModel {
  constructor(private readonly props: WishlistReadModelProps) {
    super();
  }

  toJSON(): JsonWishlistProps {
    return {
      id: this.props.id.value,
      name: this.props.name,
      total_items: this.props.totalItems,
      images: this.props.images,
      is_default: this.props.isDefault,
    };
  }
}
