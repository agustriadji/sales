import { Nullable } from '@wings-corporation/core';

export type SimulatePriceRequestSMUProps = {
  salesOffice: string;
  OrderHeader: OrderHeaderProps;
  OrderDetail: OrderDetailSMUProps[];
};

export type SimulatePriceRequestWSProps = {
  salesOffice: string;
  orderHeader: OrderHeaderProps;
  orderDetail: OrderDetailWSProps[];
};

export type OrderHeaderProps = {
  DOC_TYPE: string;
  SALES_ORG: string;
  DISTR_CHAN: string;
  DIVISION: string;
  SOLDTO: string;
  SHIPTO: string;
  BILLTO: string;
  PAYER: string;
  SALES: string;
  COLLECTOR: string;
  PRICE_DATE: string;
  PURCH_DATE: string;
  PURCH_NO_C: string;
};

export type OrderItem = {
  material: string;
  qty: number;
  uom: string;
  flash_sale_id: string;
};

type OrderDetailProps = {
  MATERIAL: string;
  QTY: number;
  UOM: string;
};

export type OrderDetailSMUProps = OrderDetailProps & {
  FLASH_SALES: string;
};

export type OrderDetailWSProps = OrderDetailProps & {
  FLASHSALES_ID: string;
};

export type SimulatePriceResponseWSProps = {
  GV_KALSM: Nullable<string>;
  GV_ISERROR: Nullable<string>;
  GV_GROSS: number;
  GI_CONDTYPE_HDR: Nullable<GICondTypeWSProps[]>;
  GI_CONDTYPE_DTL: Nullable<GICondTypeWSProps[]>;
};

export type GICondTypeWSProps = {
  POSNR: string;
  STUNR: string;
  KSCHL: string;
  VTEXT: string;
  KBETR: number;
  KOEIN: string;
  KPEIN: number;
  KMEIN: string;
  KWERT: number;
  WAERK: string;
  MATNR: string;
};

export enum VTextWSEnum {
  NET_PRICE = 'Net Price',
  TOTAL_AMOUNT = 'Total Amount',
  GROSS_PRICE = 'P.List(incl VAT) CG',
}

export type SimulatePriceResponseSMUProps = {
  gv_kalsm: Nullable<string>;
  iserror: Nullable<string>;
  gv_gross: number;
  gi_message: GIMessageSMUProps[];
  gi_condtype_hdr: Nullable<GICondTypeSMUProps[]>;
  gi_condtype_dtl: Nullable<GICondTypeSMUProps[]>;
};

export type GIMessageSMUProps = {
  TYPE: string;
  MESSAGE: string;
};

export type GICondTypeSMUProps = {
  posnr: string;
  stunr: string;
  kschl: string;
  vtext: string;
  kbetr: number;
  koein: string;
  kpein: number;
  kmein: string;
  kwert: number;
  waerk: string;
  matnr: string;
};

export enum VTextSMUEnum {
  NET_PRICE = 'Net Price',
  TOTAL_AMOUNT = 'Total Amount',
  GROSS_PRICE = 'Price List(incl VAT)',
  BATAM_VAT = 'Batam VAT',
}

export const FLASH_SALE_PROMOTION_CODE_SMU = ['ZD95', 'ZD96'];
export const REGULAR_PROMOTION_CODE_SMU = [
  // regular
  'ZD01',
  'ZD64',
  'ZD85',
  // TPR
  'ZFG2',
  'ZD03',
  'ZD62',
  'ZD38',
  'ZD60',
  'ZD65',
  'ZD42',
  'ZD51',
  'ZD39',
  'ZD67',
  'ZD43',
];

export const LIFETIME_PROMOTION_CODE = 'ZD44';
