import { DomainException } from '@wings-corporation/core';
import { DomainEvent } from '@wings-corporation/domain';
import { resolveErrorCode } from '@wings-online/common';

export type CheckoutItemResult = {
  externalId: string;
  name: string;
  baseQty: number;
  packQty: number;
};

export type CheckoutPerDivisionResult = {
  success: boolean;
  events?: DomainEvent<any>[];
  error?: DomainException;
  orderNumber?: string;
  coin?: number;
  items?: CheckoutItemResult[];
};

export type CheckoutResult = {
  dry?: CheckoutPerDivisionResult;
  frozen?: CheckoutPerDivisionResult;
};

type JsonCheckoutCartResult = {
  data: {
    dry?: JsonCheckoutCartPerDivisionResult;
    frozen?: JsonCheckoutCartPerDivisionResult;
  };
};

type JsonCheckoutCartPerDivisionResult = {
  success: boolean;
  error?: {
    code: string;
  };
  order_number?: string;
  items?: JsonCheckoutCartItemResult[];
  coin?: number;
};

type JsonCheckoutCartItemResult = {
  item_external_id: string;
  item_name: string;
  base_qty: number;
  pack_qty: number;
};

export class CheckoutCartResult {
  readonly result: CheckoutResult;
  readonly events: DomainEvent<any>[];

  constructor(result: CheckoutResult) {
    this.result = result;
    this.events = [
      ...(result.dry?.events || []),
      ...(result.frozen?.events || []),
    ];
  }

  toJSON(): JsonCheckoutCartResult {
    return {
      data: {
        dry: this.result.dry
          ? {
              success: this.result.dry.success,
              error: this.result.dry.error
                ? {
                    code: resolveErrorCode(this.result.dry.error),
                  }
                : undefined,
              order_number: this.result.dry.orderNumber,
              items: this.result.dry.items?.map((item) =>
                this.checkoutItemToJsonResult(item),
              ),
              coin: this.result.dry.coin,
            }
          : undefined,
        frozen: this.result.frozen
          ? {
              success: this.result.frozen.success,
              error: this.result.frozen.error
                ? {
                    code: resolveErrorCode(this.result.frozen.error),
                  }
                : undefined,
              order_number: this.result.frozen.orderNumber,
              items: this.result.frozen.items?.map((item) =>
                this.checkoutItemToJsonResult(item),
              ),
              coin: this.result.frozen.coin,
            }
          : undefined,
      },
    };
  }

  checkoutItemToJsonResult(
    item: CheckoutItemResult,
  ): JsonCheckoutCartItemResult {
    return {
      item_name: item.name,
      item_external_id: item.externalId,
      base_qty: item.baseQty,
      pack_qty: item.packQty,
    };
  }
}
