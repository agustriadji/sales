import { faker } from '@faker-js/faker';

import { PurchasePoint } from './purchase-point.vo';

describe('PurchasePoint', () => {
  describe('create()', () => {
    it(`should throw given value is less than 0`, () => {
      expect(() => PurchasePoint.create(faker.number.int() * -1)).toThrow();
    });

    it(`should not throw given value is 0`, () => {
      expect(() => PurchasePoint.create(0)).not.toThrow();
    });

    it(`should not throw given value is greater than 0`, () => {
      expect(() =>
        PurchasePoint.create(faker.number.int({ min: 1 })),
      ).not.toThrow();
    });
  });
});
