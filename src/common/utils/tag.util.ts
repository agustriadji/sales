import { Tag } from '@wings-online/cart/domains';

export class TagUtil {
  /**
   *
   * @param tags
   * @returns
   */
  public static toStringArray(tags: Tag[]): string[] {
    return tags.map((tag) => tag.toString());
  }

  /**
   *
   * @param tags1
   * @param tags2
   * @returns
   */
  public static tagsEqual(tags1: Tag[], tags2: Tag[]): boolean {
    if (tags1.length !== tags2.length) return false;

    return tags1.every((val, index) => val.equals(tags2[index]));
  }

  /**
   *
   * @param tags
   * @param tag
   * @returns
   */
  public static include(tags: Tag[], tag: Tag): boolean {
    return tags.some((x) => x.equals(tag));
  }
}
