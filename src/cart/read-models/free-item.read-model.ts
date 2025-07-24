import { Nullable } from '@wings-corporation/core';
import {
  PRODUCT_DEFAULT_BASE_UOM,
  PRODUCT_DEFAULT_PACK_UOM,
} from '@wings-online/product-catalog';

export type FreeItemReadModelProps = {
  externalId: string;
  name: Nullable<string>;
  baseQty: number;
  baseUom: string;
  packQty: number;
  packUom: string;
  qty: number;
};

export class FreeItemReadModel {
  constructor(public props: FreeItemReadModelProps) {}

  static create(
    props: Pick<FreeItemReadModelProps, 'externalId' | 'name'> &
      Partial<Omit<FreeItemReadModelProps, 'externalId' | 'name'>>,
  ): FreeItemReadModel {
    return new FreeItemReadModel({
      externalId: props.externalId,
      name: props.name,
      baseQty: props.baseQty || 0,
      baseUom: props.baseUom || PRODUCT_DEFAULT_BASE_UOM,
      packQty: props.packQty || 0,
      packUom: props.packUom || PRODUCT_DEFAULT_PACK_UOM,
      qty: props.qty || 0,
    });
  }
  setBaseUoM(uom: string): void {
    this.props.baseUom = uom;
  }

  setPackUoM(uom: string): void {
    this.props.packUom = uom;
  }

  setBaseQty(qty: number): void {
    this.props.baseQty = qty;
  }

  setPackQty(qty: number): void {
    this.props.packQty = qty;
  }

  setQty(qty: number): void {
    this.props.qty = qty;
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

  toObject() {
    return {
      externalId: this.props.externalId,
      name: this.props.name,
      baseQty: this.props.baseQty,
      baseUom: this.props.baseUom,
      packQty: this.props.packQty,
      packUom: this.props.packUom,
      qty: this.props.qty,
    };
  }
}
