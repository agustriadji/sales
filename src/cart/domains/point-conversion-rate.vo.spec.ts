import { faker } from '@faker-js/faker/locale/af_ZA';

import { PointConversionRate } from './point-conversion-rate.vo';

describe('PointConversionRate', () => {
  describe('create()', () => {
    it(`should throw an error given at least one value is less than or equal to 0`, () => {
      expect(() =>
        PointConversionRate.create({
          j: faker.number.int({ min: -10, max: 0 }),
          q: faker.number.int({ min: 1, max: 10 }),
          k: faker.number.int({ min: 11, max: 100 }),
        }),
      ).toThrow();
    });

    it(`should throw an error given that value is not in ascending order`, () => {
      expect(() =>
        PointConversionRate.create({
          j: faker.number.int({ min: 11, max: 100 }),
          q: faker.number.int({ min: 1, max: 10 }),
          k: faker.number.int({ min: 101, max: 1000 }),
        }),
      ).toThrow();
    });

    it(`should throw an error given that jack value is not 1`, () => {
      expect(() =>
        PointConversionRate.create({
          j: faker.number.int({ min: 2, max: 10 }),
          q: faker.number.int({ min: 11, max: 100 }),
          k: faker.number.int({ min: 101, max: 1000 }),
        }),
      ).toThrow();
    });
  });

  describe('fromExpression()', () => {
    it(`should throw given expression format is invalid`, () => {
      expect(() =>
        PointConversionRate.fromExpression(faker.string.sample()),
      ).toThrow();
    });

    it(`should throw given expression contains non-numerical values`, () => {
      expect(() =>
        PointConversionRate.fromExpression(
          `${faker.number.int()}:${faker.string.sample()}:${faker.datatype.boolean()}`,
        ),
      ).toThrow();
    });

    it(`should throw given expression values are not in ascending order`, () => {
      expect(() => PointConversionRate.fromExpression(`1:100:10`)).toThrow();
    });

    it(`should throw given first expression value is not 1`, () => {
      expect(() =>
        PointConversionRate.fromExpression(
          `${faker.number.int({ min: 2 })}:10:100`,
        ),
      ).toThrow();
    });

    it(`should return given expression is valid`, () => {
      const expected = {
        k: 100,
        q: 10,
        j: 1,
      };
      const result = PointConversionRate.fromExpression(
        `${expected.j}:${expected.q}:${expected.k}`,
      );
      expect(result.j).toEqual(expected.j);
      expect(result.q).toEqual(expected.q);
      expect(result.k).toEqual(expected.k);
    });
  });
});
