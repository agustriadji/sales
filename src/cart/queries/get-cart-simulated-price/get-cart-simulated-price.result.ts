import {
  GetTotalPriceResponse,
  JsonCartItemWithPriceProps,
} from '@wings-online/cart/interfaces';
import {
  CartReadModel,
  JsonCartItemProps,
  JsonCartProps,
} from '@wings-online/cart/read-models';
import { ProductLabel } from '@wings-online/product-catalog';

export class GetCartSimulatedPriceResult {
  readonly data: GetSimulatedPriceResponse;

  constructor(props: {
    dryCart?: CartReadModel;
    dryTotalPrice?: GetTotalPriceResponse;
    frozenCart?: CartReadModel;
    frozenTotalPrice?: GetTotalPriceResponse;
  }) {
    const { dryCart, dryTotalPrice, frozenCart, frozenTotalPrice } = props;
    const isDryCartValid = dryCart && dryTotalPrice && dryCart.items.length > 0;
    const isFrozenCartValid =
      frozenCart && frozenTotalPrice && frozenCart.items.length > 0;

    if (isDryCartValid) {
      this.setItemPrices(dryCart, dryTotalPrice);
    }
    if (isFrozenCartValid) {
      this.setItemPrices(frozenCart, frozenTotalPrice);
    }

    this.data = {
      dry: isDryCartValid
        ? {
            info: this.generateInfo(dryCart, dryTotalPrice),
            items: this.generateItems(
              dryCart.items.map((item) => item.toJSON()),
              dryTotalPrice,
            ),
          }
        : null,
      frozen: isFrozenCartValid
        ? {
            info: this.generateInfo(frozenCart, frozenTotalPrice),
            items: this.generateItems(
              frozenCart.items.map((item) => item.toJSON()),
              frozenTotalPrice,
            ),
          }
        : null,
    };
  }

  /**
   *
   * @param cart
   * @param price
   * @returns
   */
  private generateInfo(
    cart: CartReadModel,
    price: GetTotalPriceResponse,
  ): JsonCartProps {
    const info = cart.toJSON();
    const totalAmount = Math.max(
      price.total_net_price - info.voucher_discount,
      0,
    );
    if (info.loyalty) {
      info.loyalty.applied = cart.getIsLoyaltyApplied(totalAmount);
    }
    return {
      ...info,
      subtotal: price.total_gross_price,
      discount: price.total_gross_price - price.total_net_price,
      regular_discount: price.items.reduce(
        (acc, item) => acc + item.regular_discount + item.lifetime_discount,
        0,
      ),
      total_amount: totalAmount,
    };
  }

  /**
   *
   * @param items
   * @param price
   */
  private generateItems(
    items: JsonCartItemProps[],
    price: GetTotalPriceResponse,
  ): JsonCartItemSummaryProps[] {
    const result: JsonCartItemSummaryProps[] = [];
    for (const item of items) {
      const itemPrice = price.items.find(
        (priceItem) => priceItem.id === item.item_id,
      );

      const { regular, flash_sale, labels, ...others } = item;
      const qty = regular.total_qty + (flash_sale?.total_qty || 0);
      const grossPrice = (itemPrice?.gross_price || 0) / qty;

      if (flash_sale && flash_sale.total_qty > 0) {
        const subtotal = Number((grossPrice * flash_sale.total_qty).toFixed(2));
        const discount = itemPrice?.flash_sale_discount || 0;
        result.push({
          ...others,
          labels: labels.filter((l) => l !== ProductLabel.APP_PROMOTION),
          props: {
            base_qty: flash_sale.base_qty,
            pack_qty: flash_sale.pack_qty,
            total_qty: flash_sale.total_qty,
          },
          subtotal,
          discount,
          net_price: subtotal - discount,
        });
      }

      if (regular.total_qty > 0) {
        const subtotal = Number((grossPrice * regular.total_qty).toFixed(2));
        const discount = itemPrice
          ? itemPrice.regular_discount + itemPrice.lifetime_discount
          : 0;
        result.push({
          ...others,
          labels: labels.filter((l) => l !== ProductLabel.FLASH_SALE),
          props: {
            base_qty: regular.base_qty,
            pack_qty: regular.pack_qty,
            total_qty: regular.total_qty,
          },
          subtotal,
          discount,
          net_price: subtotal - discount,
        });
      }
    }

    return result;
  }

  private setItemPrices(cart: CartReadModel, price: GetTotalPriceResponse) {
    const itemPriceMap: Record<string, JsonCartItemWithPriceProps> =
      price.items.reduce((acc, priceItem) => {
        acc[priceItem.id] = priceItem;
        return acc;
      }, {});

    cart.items.map((item) => {
      const priceItem = itemPriceMap[item.item.id];
      if (priceItem?.gross_price) {
        item.setSimulatedPrice(priceItem?.gross_price / item.qty.value);
      }
    });
  }
}

type GetSimulatedPriceResponse = {
  dry: SimulatedPriceProps | null;
  frozen: SimulatedPriceProps | null;
};

type SimulatedPriceProps = {
  info?: JsonCartProps;
  items?: JsonCartItemSummaryProps[];
};

type JsonCartItemSummaryProps = Omit<
  JsonCartItemProps,
  'regular' | 'flash_sale'
> & {
  props: {
    base_qty: number;
    pack_qty: number;
    total_qty: number;
  };
  discount: number;
  net_price: number;
};
