import { DomainException } from '@wings-corporation/core';
import { EntityId, Money, Percentage } from '@wings-corporation/domain';

import { GeneralVoucher, ItemId, Tag, Voucher } from '../domains';
import { ItemVoucher } from '../domains/item-voucher.entity';

export namespace CheckoutException {
  export class BuyerSuspended extends DomainException {
    constructor() {
      super('checkout', 'buyer suspended');
    }
  }

  export class CartNotFound extends DomainException {
    constructor() {
      super('checkout', 'cart not found');
    }
  }

  export class FreezerNotQualified extends DomainException {
    constructor() {
      super('checkout', 'freezer not qualified');
    }
  }

  export class DeliveryAddressNotSet extends DomainException {
    constructor() {
      super('checkout', 'delivery address not set');
    }
  }

  export class DeliveryDateNotSet extends DomainException {
    constructor() {
      super('checkout', 'delivery date not set');
    }
  }

  export class CartIsEmpty extends DomainException {
    constructor() {
      super('checkout', 'cart is empty');
    }
  }
  export class ItemsCannotBeCheckedout extends DomainException {
    constructor() {
      super('checkout', 'items cannot be checked out');
    }
  }

  export class MinimumOrderNotMet extends DomainException {
    constructor(totalAmount: Money, minAmount: Money) {
      super('checkout', 'minimum order not met', {
        total_amount: totalAmount.value,
        min_order_amount: minAmount.value,
      });
    }
  }

  export class QuantityMustBeAFactorOf extends DomainException {
    constructor(
      nonFactorItems: { itemId: string; salesFactor: number; qty: number }[],
    ) {
      super(
        `checkout`,
        `qty not in factor
      `,
        {
          non_factor_items: nonFactorItems.map((x) => ({
            item_id: x.itemId,
            sales_factor: x.salesFactor,
            qty: x.qty,
          })),
        },
      );
    }
  }

  export class VoucherMinimumPurchaseNotMet extends DomainException {
    constructor(voucher: Voucher, totalAmount: Money) {
      super('checkout', 'voucher minimum purchase not met', {
        voucher_id: voucher.id.value,
        total_amount: totalAmount.value,
        min_purchase_amount:
          voucher instanceof GeneralVoucher
            ? voucher.minPurchase.value
            : voucher.minPurchaseAmount.value,
      });
    }
  }

  export class VoucherItemNotInCart extends DomainException {
    constructor(voucher: ItemVoucher) {
      super('checkout', 'voucher item not in cart', {
        voucher_id: voucher.id.value,
        item_id:
          voucher.target instanceof EntityId ? voucher.target.value : undefined,
        tag: voucher.target instanceof Tag ? voucher.target.value : undefined,
      });
    }
  }

  export class VoucherExceedMaxDiscount extends DomainException {
    constructor(
      voucherIds: EntityId<string>[],
      totalDiscount: Money,
      maxDiscount: Money,
      maxDiscountPercentage: Percentage,
    ) {
      super('checkout', 'voucher exceed maximum discount', {
        voucher_ids: voucherIds.map((x) => x.value),
        total_discount: totalDiscount.value,
        maximum_discount: maxDiscount.value,
        maximum_discount_percentage: maxDiscountPercentage.value,
      });
    }
  }

  export class VoucherNotApplicable extends DomainException {
    constructor(voucherId: EntityId<string>, itemId: ItemId) {
      super('checkout', 'voucher not applicable', {
        voucher_id: voucherId.value,
        item_id: itemId.value,
      });
    }
  }

  export class BuyerHaveOverdueLoan extends DomainException {
    constructor() {
      super('checkout', 'buyer have overdue loan');
    }
  }

  export class BuyerHaveDryOverdueLoan extends DomainException {
    constructor() {
      super('checkout', 'buyer have dry overdue loan');
    }
  }

  export class BuyerHaveFrozenOverdueLoan extends DomainException {
    constructor() {
      super('checkout', 'buyer have frozen overdue loan');
    }
  }

  export class InvalidSimulatedPrice extends DomainException {
    constructor() {
      super('checkout', 'simulated price is not valid');
    }
  }

  export class FlashSaleItemChanged extends DomainException {
    constructor() {
      super('checkout', 'flash sale item changed');
    }
  }
}
