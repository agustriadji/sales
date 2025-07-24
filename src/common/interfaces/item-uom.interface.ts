import { PackQty } from '@wings-online/cart/domains';

export interface ItemUom {
  base: Uom;
  pack?: Uom;
}

export interface Uom {
  name: string;
  packQty: PackQty;
}

export interface UomConversion {
  base: PackQty;
  pack?: PackQty;
}
