import { faker } from '@faker-js/faker';

import { SalesTier } from './sales-tier.vo';

describe('SalesTier', () => {
  describe('create()', () => {
    it('should create a SalesTier with the provided value', () => {
      const value = faker.number.int({ min: 1 });
      const tier = SalesTier.create(value);
      expect(tier.value).toEqual(value);
    });

    it('should create a SalesTier with the provided value is negative', () => {
      const negativeValue = faker.number.int({ min: -100, max: -1 });
      const tier = SalesTier.create(negativeValue);
      expect(tier.value).toEqual(negativeValue);
    });
  });

  describe('default()', () => {
    it('should create a SalesTier with the default value of 0', () => {
      const tier = SalesTier.default();
      expect(tier.value).toEqual(0);
    });
  });

  describe('value()', () => {
    it('should return the value of the SalesTier', () => {
      const value = faker.number.int({ min: 1 });
      const tier = SalesTier.create(value);
      expect(tier.value).toEqual(value);
    });
  });
});
