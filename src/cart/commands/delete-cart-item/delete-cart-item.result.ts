import { DomainEvent } from '@wings-corporation/domain';
import { CartTagProps } from '@wings-online/cart/domains';

export class DeleteCartItemResult {
  constructor(
    readonly item: {
      id: string;
      count: number;
    },
    readonly itemTags: Array<CartTagProps & { itemCombination: number }>,
    readonly events: DomainEvent<any>[],
  ) {}

  toJSON() {
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
        }, {}),
      },
    };
  }
}
