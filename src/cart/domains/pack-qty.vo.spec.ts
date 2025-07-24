import { faker } from '@faker-js/faker';

import { PackQty } from './pack-qty.vo';

describe('PackQty', () => {
  describe('create()', () => {
    it(`should throw given that value is less than 1`, () => {
      expect(() => PackQty.create(0)).toThrow();
    });

    it(`should not throw given that value is at least 1`, () => {
      expect(() => PackQty.create(faker.number.int({ min: 1 }))).not.toThrow();
    });
  });

  describe('value()', () => {
    it(`should return value`, () => {
      const value = faker.number.int({ min: 1 });
      const qty = PackQty.create(value);
      expect(qty.value).toEqual(value);
    });
  });
});
