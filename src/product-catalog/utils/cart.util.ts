import { Quantity } from '@wings-corporation/domain';

interface UomCartQuantity {
  base: Quantity;
  pack: Quantity;
}

export class CartUtil {
  static getUomCartQty(
    totalQty: Quantity,
    itemPackQty?: Quantity,
  ): UomCartQuantity {
    let cartBaseQty: Quantity = Quantity.zero();
    let cartPackQty: Quantity = Quantity.zero();
    if (itemPackQty) {
      const baseQty = totalQty.value % itemPackQty.value;
      cartBaseQty = Quantity.create(baseQty);
      cartPackQty = Quantity.create(totalQty.value - baseQty);
    } else {
      cartBaseQty = totalQty;
    }

    return {
      base: cartBaseQty,
      pack: cartPackQty,
    };
  }
}
