import { faker } from '@faker-js/faker';
import { TagKey, TagKeys } from '@wings-online/app.constants';

import { SalesItemConfig } from './sales-item-config.vo';
import { Tag } from './tag.vo';

describe('SalesItemConfig', () => {
  describe('tier()', () => {
    it('should return tier 1 when key does not contain colon', () => {
      const factor = SalesItemConfig.create({
        key: faker.lorem.word(),
        tags: [],
      });
      expect(factor.tier.value).toBe(1);
    });

    it('should return tier 2 when key contains colon', () => {
      const factor = SalesItemConfig.create({
        key: `${faker.lorem.word()}:${faker.lorem.word()}`,
        tags: [],
      });
      expect(factor.tier.value).toBe(2);
    });
  });

  describe('key()', () => {
    it(`should return key value`, () => {
      const expected = faker.lorem.word();
      const factor = SalesItemConfig.create({
        key: expected,
        tags: [],
      });
      expect(factor.key).toEqual(expected);
    });
  });

  describe('tags()', () => {
    it(`should return tags value`, () => {
      const tag = Tag.create({
        key: faker.helpers.arrayElement(TagKeys) as TagKey,
        value: faker.lorem.word(),
      });
      const tags = Array.from({ length: faker.number.int(5) }, () => tag);
      const factor = SalesItemConfig.create({
        key: faker.lorem.word(),
        tags: tags,
      });
      expect(factor.tags).toEqual(tags);
    });
  });
});
