import { Nullable } from '@wings-corporation/core';
import {
  IAggregateRoot,
  Money,
  Quantity,
  WatchedProps,
} from '@wings-corporation/domain';
import { CartType } from '@wings-online/cart/cart.constants';
import { DeliveryAddressId } from '@wings-online/cart/interfaces';
import { LoyaltyPromo } from '@wings-online/cart/promotion';

import { CheckoutItemVoucherList } from '../checkout-item-voucher.list';
import { CheckoutItem } from '../checkout-item.entity';
import { ItemFlashSale } from '../item-promotion.entity';
import { GeneralVoucher } from '../voucher.entity';

export interface CheckoutOptions {
  deliveryDate: Date;
  buyerLocation: {
    latitude: number;
    longitude: number;
  };
  isSimulatePrice: boolean;
}

export interface PromoCmsRedemption {
  criteriaId: string;
  qty: Quantity;
}

export interface FreeItem {
  externalId: string;
  name: Nullable<string>;
  baseQty: number;
  baseUom: string;
  packUom: Nullable<string>;
  packQty: number;
}

export interface ICheckoutAggregate
  extends IAggregateRoot<
    {
      orderNumber: string;
      orderDate: Date;
      items: CheckoutItem[];
      itemFlashSale: Record<number, ItemFlashSale>;
      generalVoucher: WatchedProps<Nullable<GeneralVoucher>>;
      itemVouchers: CheckoutItemVoucherList;
    },
    string
  > {
  checkout(props: CheckoutOptions): void;
  unapplyVoucher(voucherId: string): void;

  get deliveryAddressId(): Nullable<DeliveryAddressId>;
  get type(): CartType;
  get freeItems(): FreeItem[];
  get orderNumber(): string;
  get items(): CheckoutItem[];
  get coin(): Money;
  get promoCmsRedemptions(): PromoCmsRedemption[];

  setDeliveryAddress(id: DeliveryAddressId): void;
  checkSimulatedPrice(): void;
  setLoyalty(loyalty: LoyaltyPromo): void;
}
