import { IIdentity } from '@wings-corporation/core';

export type UserIdentity = IIdentity & {
  externalId: string;
  isActive: boolean;
  division: UserDivision;
};

export type UserDivision =
  | DryDivision
  | FrozenDivision
  | BothDivision
  | NoneDivision;

export interface DivisionInfo {
  dry?: IDivisionInfo;
  frozen?: IDivisionInfo;
  type: DivisionType;
}

export interface DryDivision extends DivisionInfo {
  dry: IDivisionInfo;
  type: 'DRY';
}

export interface FrozenDivision extends DivisionInfo {
  frozen: IDivisionInfo;
  type: 'FROZEN';
}

export interface BothDivision extends DivisionInfo {
  dry: IDivisionInfo;
  frozen: IDivisionInfo;
  type: 'BOTH';
}

export interface NoneDivision extends DivisionInfo {
  type: 'NONE';
}

export type IDivisionInfo = {
  group: string;
  salesOrg: string;
  distChannel: string;
  salesOffice: string;
  salesGroup: string;
  customerHier: string;
  priceListType: string;
  isRetailS: boolean;
  defaultDeliveryAddressId?: string;
  term?: string;
  payerId?: string;
  salesCode?: string;
};

export type DivisionType = 'BOTH' | 'DRY' | 'FROZEN' | 'NONE';
