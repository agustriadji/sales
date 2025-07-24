import { Quantity } from '@wings-corporation/domain';

export type Purchase = {
  qty: Quantity;
};

export type TagPurchase = {
  items: ItemPurchase[];
} & Purchase;

export type ItemPurchase = {
  itemId: string;
} & Purchase;
