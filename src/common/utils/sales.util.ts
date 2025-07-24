import { Money, Percentage, Quantity } from '@wings-corporation/domain';
import {
  RETAIL_S_GROUP,
  UomType,
  UomTypeEnum,
} from '@wings-online/app.constants';
import {
  PackQty,
  SalesFactor,
  SalesItemConfig,
  SalesItemFactor,
  SalesItemPrice,
  Tag,
} from '@wings-online/cart/domains';
import { SalesTier, UserIdentity } from '@wings-online/common';

import { UomConversion } from '../interfaces/item-uom.interface';
import { ISalesUom } from '../interfaces/sales.interface';

export class SalesUtil {
  /**
   *
   * @param configs
   * @returns
   */
  public static getEffectiveSalesFactor(
    configs: SalesItemFactor[],
  ): SalesFactor {
    return configs.length > 0
      ? SalesFactor.create(
          configs.reduce((prev, current) => {
            return prev && current.tier > prev.tier ? current : prev;
          }).salesFactor,
        )
      : SalesFactor.create(1);
  }

  /**
   *
   * @param prices
   * @returns
   */
  public static getEffectiveSalesPrice(prices: SalesItemPrice[]): Money {
    return prices.length > 0
      ? Money.create(
          prices.reduce((prev, current) => {
            if (!prev) return current;
            return prev.tier > current.tier ? prev : current;
          }).price,
        )
      : Money.zero();
  }

  public static getEffectiveBaseUom(
    baseUom: string,
    uoms: ISalesUom[],
  ): ISalesUom {
    const defaultUom: ISalesUom = {
      tier: SalesTier.default(),
      name: baseUom,
      qty: PackQty.create(1),
    };
    uoms.push(defaultUom);

    const uom = uoms.sort((a, b) => a.tier.value - b.tier.value);
    return uom[uom.length - 1];
  }

  public static getEffectiveSalesConfig(
    configs: SalesItemConfig[],
  ): SalesItemConfig | undefined {
    if (configs.length <= 0) return undefined;
    return configs.reduce((prev, current) => {
      return prev && current.tier > prev.tier ? current : prev;
    });
  }

  public static isRetailS(identity: UserIdentity): boolean {
    return (
      (identity.organization !== 'WS' &&
        identity.division.dry?.group === RETAIL_S_GROUP) ||
      identity.division.frozen?.group === RETAIL_S_GROUP
    );
  }

  public static convertPriceToHET(
    price: Money,
    hetPercentage: Percentage,
  ): Money {
    return Money.create(
      Math.ceil((price.value * ((hetPercentage.value + 100) / 100)) / 500) *
        500,
    );
  }

  /**
   *
   * @param entity
   * @returns
   */
  public static mapToSalesItemConfig(entity: {
    key: string;
    tags: string[];
  }): SalesItemConfig {
    return SalesItemConfig.create({
      key: entity.key,
      tags: entity.tags.map((tag) => Tag.fromString(tag)),
    });
  }

  public static mapToSalesItemPrice(entity: {
    tier: number;
    price: number;
  }): SalesItemPrice {
    return SalesItemPrice.create(
      SalesTier.create(entity.tier),
      Money.create(entity.price),
    );
  }

  public static convertQtyToBaseQty(
    qty: number,
    uomType: UomType,
    itemUom: UomConversion,
  ): Quantity {
    if (uomType === UomTypeEnum.PACK) {
      return Quantity.create(qty * (itemUom.pack?.value || 1));
    } else if (uomType === UomTypeEnum.INTERMEDIATE) {
      return Quantity.create(qty * itemUom.base.value);
    }

    return Quantity.create(qty);
  }

  public static getQtyInIntermediate(
    qty: Quantity,
    baseUomQty: PackQty,
  ): Quantity {
    if (baseUomQty.value === 1) {
      return Quantity.zero();
    }

    return Quantity.create(Math.floor(qty.value / baseUomQty.value));
  }

  public static getQtyInPack(qty: Quantity, packUomQty?: PackQty): Quantity {
    if (!packUomQty || packUomQty.equals(Quantity.create(1))) {
      return Quantity.zero();
    }

    return Quantity.create(Math.floor(qty.value / packUomQty.value));
  }

  public static getQtyByUomType(
    purchaseQty: {
      qty: Quantity;
      qtyIntermediate: Quantity;
      qtyPack: Quantity;
    },
    uomType: UomType,
  ): Quantity {
    if (uomType === UomTypeEnum.BASE) {
      return purchaseQty.qty;
    } else if (uomType === UomTypeEnum.PACK) {
      return purchaseQty.qtyPack;
    } else if (uomType === UomTypeEnum.INTERMEDIATE) {
      return purchaseQty.qtyIntermediate;
    } else {
      return Quantity.zero();
    }
  }
}
