import { Tag } from '@wings-online/cart/domains';

import { TagUtil } from './tag.util';

describe('TagUtil', () => {
  describe('toStringArray()', () => {
    it('should convert Tag[] to an array of string representations', () => {
      const tags = [
        Tag.create({ key: 'grp01', value: 'vegetable' }),
        Tag.create({ key: 'grp02', value: 'red' }),
      ];

      const stringArray = TagUtil.toStringArray(tags);
      expect(stringArray.length).toEqual(2);
      expect(stringArray).toContain('grp01:vegetable');
      expect(stringArray).toContain('grp02:red');
    });
  });

  describe('equals()', () => {
    it('should return true given Tag[] are equal', () => {
      const tags1 = [
        Tag.create({ key: 'grp01', value: 'fruit' }),
        Tag.create({ key: 'grp02', value: 'red' }),
      ];
      const tags2 = [
        Tag.create({ key: 'grp01', value: 'fruit' }),
        Tag.create({ key: 'grp02', value: 'red' }),
      ];

      expect(TagUtil.tagsEqual(tags1, tags2)).toBeTruthy();
    });

    it('should return false given Tag[] are not equal', () => {
      const tags1 = [Tag.create({ key: 'grp01', value: 'fruit' })];
      const tags2 = [Tag.create({ key: 'grp01', value: 'vegetable' })];

      expect(TagUtil.tagsEqual(tags1, tags2)).toBeFalsy();
    });
  });
});
