import { faker } from '@faker-js/faker';
import { Money } from '@wings-corporation/domain';
import { SalesTier } from '@wings-online/common';

import { SalesItemPrice } from './sales-item-price.vo';

describe('SalesItemPrice', () => {
  describe('tier()', () => {
    it(`should return tier value`, () => {
      const value = faker.number.int();
      const tier = SalesTier.create(value);
      const price = Money.create(faker.number.int({ min: 1 }));
      const itemPrice = SalesItemPrice.create(tier, price);
      expect(itemPrice.tier).toEqual(value);
    });
  });

  describe('price()', () => {
    it(`should return price value`, () => {
      const expected = faker.number.int({ min: 1 });
      const itemPrice = SalesItemPrice.create(
        SalesTier.create(faker.number.int()),
        Money.create(expected),
      );
      expect(itemPrice.price).toEqual(expected);
    });
  });
});
