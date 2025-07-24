import { DomainEvent } from '@wings-corporation/domain';
import { CartTagProps } from '@wings-online/cart/domains';

type JsonTagItemProps = Array<{
  id: string;
  qty: number;
}>;
type JsonTagsProps = Record<
  string,
  {
    base: number;
    item_combination: number;
    items: JsonTagItemProps;
  }
>;

type JsonPutCartItemResultProps = {
  data: { total_item: number; item_tags: JsonTagsProps };
};

export class PutCartItemResult {
  constructor(
    readonly item: {
      id: string;
      count: number;
    },
    readonly itemTags: Array<CartTagProps & { itemCombination: number }>,
    readonly events: DomainEvent<any>[],
  ) {}

  toJSON(): JsonPutCartItemResultProps {
    return {
      data: {
        total_item: this.item.count,
        item_tags: this.itemTags.reduce((acc, tag) => {
          acc[tag.tag.toString()] = {
            base: tag.qty.value,
            item_combination: tag.itemCombination,
            items: tag.items
              .sort((a, b) => a.addedAt.getTime() - b.addedAt.getTime())
              .map((x) => ({
                id: x.itemId,
                qty: x.qty.value,
              })),
          };
          return acc;
        }, {} as JsonTagsProps),
      },
    };
  }
}
