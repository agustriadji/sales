import { Money } from '@wings-corporation/domain';
import {
  JqkPoint,
  PointConversionRate,
  PurchasePoint,
} from '@wings-online/cart/domains';

export type PointConversionExpression = string;

export class PointUtil {
  /**
   *
   * @param purchaseAmount
   * @param increments
   * @returns
   */
  public static calculatePurchasePoint(
    purchaseAmount: Money,
    increments: Money,
  ): PurchasePoint {
    if (purchaseAmount.lt(increments)) return PurchasePoint.zero();
    return PurchasePoint.create(
      Math.floor(purchaseAmount.value / increments.value),
    );
  }

  /**
   *
   * @param point
   * @param conversionRate
   * @returns
   */
  public static calculateJqkPoint(
    point: PurchasePoint,
    conversionRate: PointConversionRate,
  ): JqkPoint {
    let j = 0;
    let q = 0;
    let k = 0;

    k = Math.floor(point.value / conversionRate.k);
    const kRemainder = point.value % conversionRate.k;
    q = kRemainder > 0 ? Math.floor(kRemainder / conversionRate.q) : 0;
    j = kRemainder % conversionRate.q;

    return JqkPoint.create(j, q, k);
  }
}
