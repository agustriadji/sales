import { faker } from '@faker-js/faker';

import { MathUtil } from './math.util';

describe('MathUtil', () => {
  describe('scaleRatio()', () => {
    it('should scale correctly', () => {
      const a = 19;
      const b = 2;
      const scale = { x: 9, y: 2 };
      const result = MathUtil.maxScale(a, b, scale);
      expect(result).toEqual({ x: 9, y: 2 });
    });

    it('should scale correctly', () => {
      const a = 100;
      const b = 5;
      const scale = { x: 9, y: 2 };

      const result = MathUtil.maxScale(a, b, scale);
      expect(result).toEqual({ x: 18, y: 4 });
    });

    it('should scale correctly', () => {
      const a = 50;
      const b = 50;
      const scale = { x: 9, y: 2 };

      const result = MathUtil.maxScale(a, b, scale);
      expect(result).toEqual({ x: 45, y: 10 });
    });

    it('should return (0,0) when a or b is less than scale.x or scale.y', () => {
      const a = faker.number.int({ min: 0, max: 10 });
      const b = faker.number.int({ min: 0, max: 10 });
      const scale = {
        x: faker.number.int({ min: 11 }),
        y: faker.number.int({ min: 11 }),
      };

      const result = MathUtil.maxScale(a, b, scale);
      expect(result).toEqual({ x: 0, y: 0 });
    });
  });
});
