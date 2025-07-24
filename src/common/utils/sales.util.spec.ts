import { faker } from '@faker-js/faker';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { SalesFactorStub } from '@stubs/common.stub';
import { SalesItemFactor, SalesItemPrice } from '@wings-online/cart/domains';

import { SalesUtil } from './sales.util';

describe('SalesUtil', () => {
  describe('factor()', () => {
    it(`should use config with the highest tier`, () => {
      const max = 100;
      const highest = createMock<SalesItemFactor>({
        tier: max,
        salesFactor: 3,
      });
      const configs = [
        ...faker.helpers.multiple<DeepMocked<SalesItemFactor>>(() =>
          createMock<SalesItemFactor>({
            tier: faker.number.int({ max: max - 1 }),
            salesFactor: SalesFactorStub.generate().value,
          }),
        ),
        highest,
      ];

      expect(SalesUtil.getEffectiveSalesFactor(configs).value).toBe(
        highest.salesFactor,
      );
    });

    it(`should default to 1 given config is not available`, () => {
      const configs = [];
      expect(SalesUtil.getEffectiveSalesFactor(configs).value).toBe(1);
    });
  });

  describe('getEffectiveSalesPrice()', () => {
    it(`should use price with the highest tier`, () => {
      const max = 100;
      const highest = createMock<SalesItemPrice>({
        tier: max,
        price: faker.number.int({ min: 1000 }),
      });

      const prices = [
        ...faker.helpers.multiple<DeepMocked<SalesItemPrice>>(() =>
          createMock<SalesItemPrice>({
            tier: faker.number.int({ max: max - 1 }),
            price: faker.number.int({ min: 1000 }),
          }),
        ),
        highest,
      ];

      expect(SalesUtil.getEffectiveSalesPrice(prices).value).toBe(
        highest.price,
      );
    });
  });

  // FIXME re-implement the test once we finalize the base sellable logic
  // describe('getEffectiveItemBaseSellable()', () => {
  //   it(`should use config with the highest tier`, () => {
  //     const max = 100;
  //     const highest = createMock<SalesItemConfig>({
  //       tier: max,
  //       isBaseSellable: faker.datatype.boolean(),
  //       isPackSellable: faker.datatype.boolean(),
  //     });
  //     const configs = [
  //       ...faker.helpers.multiple<DeepMocked<SalesItemConfig>>(() =>
  //         createMock<SalesItemConfig>({
  //           tier: faker.number.int({ max: max - 1 }),
  //           isBaseSellable: faker.datatype.boolean(),
  //           isPackSellable: faker.datatype.boolean(),
  //         }),
  //       ),
  //       highest,
  //     ];

  //     expect(SalesUtil.getEffectiveItemBaseSellable(configs)).toBe(
  //       highest.isBaseSellable,
  //     );
  //   });

  //   it(`should default to false given config is not available`, () => {
  //     const configs = [];
  //     expect(SalesUtil.getEffectiveItemBaseSellable(configs)).toBeFalsy();
  //   });
  // });

  // TODO re-implement or remove this once there is a clarity on what we will do with this method
  //   describe('getEffectiveItemPackSellable()', () => {
  //     it(`should use config with the highest tier`, () => {
  //       const max = 100;
  //       const highest = createMock<SalesItemConfig>({
  //         tier: max,
  //         isBaseSellable: faker.datatype.boolean(),
  //         isPackSellable: faker.datatype.boolean(),
  //       });
  //       const configs = [
  //         ...faker.helpers.multiple<DeepMocked<SalesItemConfig>>(() =>
  //           createMock<SalesItemConfig>({
  //             tier: faker.number.int({ max: max - 1 }),
  //             isBaseSellable: faker.datatype.boolean(),
  //             isPackSellable: faker.datatype.boolean(),
  //           }),
  //         ),
  //         highest,
  //       ];

  //       expect(SalesUtil.getEffectiveItemPackSellable(configs)).toBe(
  //         highest.isPackSellable,
  //       );
  //     });

  //     it(`should default to false given config is not available`, () => {
  //       const configs = [];
  //       expect(SalesUtil.getEffectiveItemPackSellable(configs)).toBeFalsy();
  //     });
  //   });
});
