import { faker } from '@faker-js/faker';
import {
  JACK_POINT_TYPE,
  KING_POINT_TYPE,
  QUEEN_POINT_TYPE,
} from '@wings-online/app.constants';

import { PointType } from './point-type.vo';

describe('PointType', () => {
  describe('jack()', () => {
    it(`should create a point type with value JACK_POINT_TYPE`, () => {
      expect(PointType.jack().value).toEqual(JACK_POINT_TYPE);
    });
  });

  describe('queen()', () => {
    it(`should create a point type with value QUEEN_POINT_TYPE`, () => {
      expect(PointType.queen().value).toEqual(QUEEN_POINT_TYPE);
    });
  });

  describe('king()', () => {
    it(`should create a point type with value KING_POINT_TYPE`, () => {
      expect(PointType.king().value).toEqual(KING_POINT_TYPE);
    });
  });

  describe('value()', () => {
    it(`should return point type value`, () => {
      const value = faker.string.sample();
      const type = PointType.create(value);
      expect(type.value).toEqual(value);
    });
  });
});
