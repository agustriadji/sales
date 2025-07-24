import { Nullable } from '@wings-corporation/core';

type Price = {
  listed: number;
  offered: number;
};

export type CartItemPrice = {
  base: Price;
  pack: Nullable<Price>;
};
