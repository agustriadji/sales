import { faker } from '@faker-js/faker';
import { Money } from '@wings-corporation/domain';

import { PromoPercentage } from './promo-percentage.vo';

describe('PromoPercentage', () => {
  describe('create()', () => {
    it(`should throw given that value is less than 0`, () => {
      expect(() => PromoPercentage.create(faker.number.int() * -1)).toThrow();
    });

    it(`should throw given type is percentage and value is more than 100`, () => {
      expect(() =>
        PromoPercentage.create(faker.number.int({ min: 101 })),
      ).toThrow();
    });

    it(`should not throw given that value is greater than 0`, () => {
      expect(() =>
        PromoPercentage.create(faker.number.int({ min: 1, max: 100 })),
      ).not.toThrow();
    });
  });

  describe('value()', () => {
    it(`should return amount`, () => {
      const value = faker.number.int({ min: 1, max: 100 });
      const percentage = PromoPercentage.create(value);
      expect(percentage.value).toEqual(value);
    });
  });

  describe('calculate()', () => {
    it(`should return promo amount`, () => {
      const percentage = PromoPercentage.create(
        faker.number.int({ min: 1, max: 100 }),
      );
      const price = Money.create(faker.number.int({ min: 1 }));
      const expected = (price.value * percentage.value) / 100;
      expect(percentage.calculate(price).value).toEqual(expected);
    });
  });
});
