import { faker } from '@faker-js/faker';
import { Money } from '@wings-corporation/domain';
import { PointConversionRate, PurchasePoint } from '@wings-online/cart/domains';

import { PointUtil } from './point.util';

describe('PointUtil', () => {
  describe('calculatePurchasePoint()', () => {
    it(`should return 0 given purchase amount did not meet minimum increment`, () => {
      const purchaseAmount = Money.create(faker.number.int({ max: 99 }));
      const increments = Money.create(faker.number.int({ min: 100 }));

      const point = PointUtil.calculatePurchasePoint(
        purchaseAmount,
        increments,
      );
      expect(point.value).toEqual(0);
    });

    it(`should round down point`, () => {
      const purchaseAmount = Money.create(199);
      const increments = Money.create(50);

      const point = PointUtil.calculatePurchasePoint(
        purchaseAmount,
        increments,
      );
      expect(point.value).toEqual(
        Math.floor(purchaseAmount.value / increments.value),
      );
    });
  });

  describe('calculateJqkPoint()', () => {
    it(`should calculate point correctly`, () => {
      const rate: PointConversionRate = PointConversionRate.create({
        j: 1,
        q: faker.number.int({ min: 2, max: 10 }),
        k: faker.number.int({ min: 11, max: 100 }),
      });
      const king = faker.number.int({ max: rate.k - 1 });
      const queen = faker.number.int({ min: 0, max: rate.k / rate.q - 1 });
      const jack = faker.number.int({ min: 0, max: rate.q - 1 });
      const point = PurchasePoint.create(
        // eslint-disable-next-line prettier/prettier
        king * rate.k + queen * rate.q + jack * rate.j,
      );
      const jqk = PointUtil.calculateJqkPoint(point, rate);
      expect(jqk.jack).toEqual(jack);
      expect(jqk.queen).toEqual(queen);
      expect(jqk.king).toEqual(king);
    });
  });
});
