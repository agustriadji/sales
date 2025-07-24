import { faker } from '@faker-js/faker';

import { PointType } from './point-type.vo';
import { Point } from './point.vo';

describe('Point', () => {
  describe('create()', () => {
    it(`should throw given value is less than 0`, () => {
      expect(() =>
        Point.create(
          PointType.create(faker.string.sample()),
          faker.number.int() * -1,
        ),
      ).toThrow();
    });

    it(`should not throw given value is greater than 0`, () => {
      expect(() =>
        Point.create(
          PointType.create(faker.string.sample()),
          faker.number.int({ min: 1 }),
        ),
      ).not.toThrow();
    });
  });

  describe('type()', () => {
    it(`should return point type value`, () => {
      const type = faker.string.sample();
      const point = Point.create(
        PointType.create(type),
        faker.number.int({ min: 1 }),
      );
      expect(point.type).toEqual(type);
    });
  });
});
