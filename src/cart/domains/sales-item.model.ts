import { Nullable } from '@wings-corporation/core';
import { Money } from '@wings-corporation/domain';

import { ItemType } from '../cart.constants';
import { ItemId } from './item-id';
import { PackQty } from './pack-qty.vo';
import { SalesFactor } from './sales-factor.vo';
import { Tag } from './tag.vo';

export interface SalesItemModel {
  id: ItemId;
  base: ItemUom;
  pack?: ItemUom;
  price: Money;
  factor: SalesFactor;
  tags: Tag[];
  isActive: boolean;
  type: ItemType;
}

export type ItemUom = {
  uom: string;
  contains: PackQty;
};

export interface SalesItemUomReadModelProps {
  id: ItemId;
  externalId: string;
  name: Nullable<string>;
  imageUrl: Nullable<string>;
  base: ItemUom;
  intermediate: Nullable<ItemUom>;
  pack: Nullable<ItemUom>;
}

interface JsonUomProps {
  uom: string;
  pack_qty: number;
}

export interface JsonFreeProductProps {
  id: string;
  name: Nullable<string>;
  image_url: Nullable<string>;
  base: JsonUomProps;
  intermediate: Nullable<JsonUomProps>;
  pack: Nullable<JsonUomProps>;
}

export class SalesItemUomReadModel {
  constructor(readonly props: SalesItemUomReadModelProps) {}

  get id(): ItemId {
    return this.props.id;
  }

  get externalId(): string {
    return this.props.externalId;
  }

  get name(): Nullable<string> {
    return this.props.name;
  }

  get imageUrl(): Nullable<string> {
    return this.props.imageUrl;
  }

  get base(): ItemUom {
    return this.props.base;
  }

  get intermediate(): Nullable<ItemUom> {
    return this.props.intermediate;
  }

  get pack(): Nullable<ItemUom> {
    return this.props.pack;
  }

  toJSON(): JsonFreeProductProps {
    return {
      id: this.id.value,
      name: this.name || null,
      image_url: this.imageUrl,
      base: {
        uom: this.base.uom,
        pack_qty: this.base.contains.value,
      },
      intermediate: this.intermediate
        ? {
            uom: this.intermediate.uom,
            pack_qty: this.intermediate.contains.value,
          }
        : null,
      pack: this.pack
        ? {
            uom: this.pack.uom,
            pack_qty: this.pack.contains.value,
          }
        : null,
    };
  }
}
