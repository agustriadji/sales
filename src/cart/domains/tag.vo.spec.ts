import { Tag } from './tag.vo';

describe('Tag', () => {
  describe('create()', () => {
    it('should create a Tag with specified key and value', () => {
      const key = 'grp01';
      const value = 'fruit';
      const tag = Tag.create({ key, value });

      expect(tag.key).toEqual(key);
      expect(tag.value).toEqual(value);
    });
  });

  describe('fromString()', () => {
    it('should create a Tag from a valid string format', () => {
      const tagString = 'color:red';
      const tag = Tag.fromString(tagString);

      expect(tag.key).toEqual('color');
      expect(tag.value).toEqual('red');
    });

    it('should throw an error for invalid string format', () => {
      const invalidTagString = 'invalidformat';

      expect(() => {
        Tag.fromString(invalidTagString);
      }).toThrow('Invalid tag format');
    });
  });

  describe('toString()', () => {
    it('should return a string representation of the Tag', () => {
      const key = 'grp01';
      const value = 'book';
      const tag = Tag.create({ key, value });

      expect(tag.toString()).toEqual('grp01:book');
    });
  });
});
