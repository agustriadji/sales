import { Nullable } from '@wings-corporation/core';
import { DomainEvent } from '@wings-corporation/domain';
import { RecommendationType } from '@wings-online/app.constants';
import { UserIdentity } from '@wings-online/common';

export type CartCheckedOutEventData = {
  orderNumber: string;
  orderDate: Date;
  cartId: string;
  deliveryDate: Date;
  deliveryAddressId: Nullable<string>;
  buyer: {
    id: string;
    externalId: string;
    distChannel: string;
    salesOffice: string;
    salesOrg: string;
    group: string;
    location: {
      latitude: number;
      longitude: number;
    };
  };
  items: Array<{
    qty: number;
    price: number;
    recommendationType: Nullable<RecommendationType>;
    flashSale: {
      qty: number;
      discount: number;
      coin: number;
      externalId: Nullable<string>;
    };
    promotion: {
      qty: number;
      discount: number;
      coin: number;
      regularPromoExternalId: Nullable<string>;
    };
    item: {
      id: string;
      externalId: string;
      description: Nullable<string>;
      baseUom: string;
      packUom: Nullable<string>;
      baseQty: number;
      packQty: number;
      tags: string[];
    };
    voucherId: Nullable<string>;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  generalVoucher: Nullable<{
    id: string;
    discount: number;
    percentage: Nullable<number>;
    minPurchase: number;
    maxDiscount: Nullable<number>;
  }>;
  itemVouchers: Array<{
    id: string;
    discount: number;
    percentage: Nullable<number>;
    minPurchase: number;
    maxDiscount: Nullable<number>;
  }>;
  freeItems: Array<{
    externalId: string;
    name: Nullable<string>;
    baseQty: number;
    baseUom: string;
    packUom: Nullable<string>;
    packQty: number;
  }>;
  isSimulatePrice: boolean;
  identity: UserIdentity;
};

export class CartCheckedOut extends DomainEvent<CartCheckedOutEventData> {
  readonly name = 'CartCheckedOut';
  readonly version = 1;

  constructor(data: CartCheckedOutEventData) {
    super(data);
  }
}
