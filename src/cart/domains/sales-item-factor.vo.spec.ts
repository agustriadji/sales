import { faker } from '@faker-js/faker';
import { SalesFactorStub } from '@stubs/common.stub';
import { SalesTier } from '@wings-online/common';

import { SalesItemFactor } from './sales-item-factor.vo';

describe('SalesItemFactor', () => {
  describe('tier()', () => {
    it(`should return tier value`, () => {
      const value = faker.number.int();
      const tier = SalesTier.create(value);
      const factor = SalesItemFactor.create(tier, SalesFactorStub.generate());
      expect(factor.tier).toEqual(value);
    });
  });

  describe('factor()', () => {
    it(`should return salesFactor value`, () => {
      const expected = SalesFactorStub.generate();
      const factor = SalesItemFactor.create(
        SalesTier.create(faker.number.int()),
        expected,
      );
      expect(factor.salesFactor).toEqual(expected.value);
    });
  });
});
