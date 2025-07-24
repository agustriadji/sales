import { Nullable } from '@wings-corporation/core';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import { ProductLabel } from '@wings-online/product-catalog';

type ItemUom = {
  base: string;
  intermediate?: string;
  pack?: string;
};

export type ItemReadModelProps = {
  id: string;
  externalId: string;
  name: Nullable<string>;
  imageUrl: Nullable<string>;
  baseQty: number;
  packQty: number;
  totalQty: number;
  uom: ItemUom;
  baseUoM: string;
  packUoM: Nullable<string>;
  salesFactor: number;
  tags: string[];
  labels: ProductLabel[];
  isBaseSellable: boolean;
  isPackSellable: boolean;
};

export class ItemReadModel {
  constructor(public props: ItemReadModelProps) {}

  get id(): string {
    return this.props.id;
  }

  get externalId(): string {
    return this.props.externalId;
  }

  get baseQty(): number {
    return this.props.baseQty;
  }

  get packQty(): number {
    return this.props.packQty;
  }

  get totalQty(): number {
    return this.props.totalQty;
  }

  get salesFactor(): number {
    return this.props.salesFactor;
  }

  get name(): Nullable<string> {
    return this.props.name;
  }

  get imageUrl(): Nullable<string> {
    return this.props.imageUrl;
  }

  get tags(): string[] {
    return this.props.tags;
  }

  get labels(): ProductLabel[] {
    return this.props.labels;
  }

  get isBaseSellable(): boolean {
    return this.props.isBaseSellable;
  }

  get isPackSellable(): boolean {
    return this.props.isPackSellable;
  }

  get baseUoM(): string {
    return this.props.baseUoM;
  }

  get packUoM(): Nullable<string> {
    return this.props.packUoM;
  }

  get uom(): ItemUom {
    return this.props.uom;
  }

  get baseUomType(): UomType {
    if (this.baseUoM === this.props.uom.pack) {
      return UomTypeEnum.PACK;
    } else if (this.baseUoM === this.props.uom.intermediate) {
      return UomTypeEnum.INTERMEDIATE;
    }
    return UomTypeEnum.BASE;
  }

  hasPackUoM(): boolean {
    return this.props.packUoM !== null && !!this.props.packQty;
  }

  hasIntermediateUoM(): boolean {
    return this.props.baseQty !== 1;
  }
}
