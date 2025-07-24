import { ValueObject } from '@wings-corporation/domain';
import { TagKey } from '@wings-online/app.constants';

export type TagProps = {
  key: TagKey;
  value: string;
};

export class Tag extends ValueObject<TagProps> {
  private constructor(props: TagProps) {
    super(props);
  }

  public static create(props: TagProps) {
    return new Tag(props);
  }

  public static fromString(tag: string): Tag {
    const colonIndex = tag.indexOf(':');
    if (colonIndex === -1) {
      throw new Error('Invalid tag format');
    }

    const key = tag.substring(0, colonIndex) as TagKey;
    const value = tag.substring(colonIndex + 1);

    return Tag.create({
      key: key,
      value: value,
    });
  }

  get key(): TagKey {
    return this._value.key;
  }

  get value(): string {
    return this._value.value;
  }

  toString(): string {
    return `${this.key}:${this.value}`;
  }
}
