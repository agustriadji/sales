import {
  Criterion,
  ItemPurchaseAmountBetweenCriterion,
  ItemPurchaseBetweenCriterion,
  ItemTagPurchaseBetweenCriterion,
  MinimumItemPurchaseAmountCriterion,
  MinimumItemPurchaseCriterion,
  MinimumItemTagPurchaseCriterion,
} from '@wings-online/cart/domains/promo-criteria.vo';
import { PurchaseSummary } from '@wings-online/cart/interfaces/promotion.interface';

export class PromoCriterionUtil {
  public static check(criterion: Criterion, against: PurchaseSummary): boolean {
    if (
      criterion instanceof MinimumItemPurchaseCriterion ||
      criterion instanceof ItemPurchaseBetweenCriterion ||
      criterion instanceof MinimumItemPurchaseAmountCriterion ||
      criterion instanceof ItemPurchaseAmountBetweenCriterion
    ) {
      const item = against.items[criterion.itemId.value];

      if (!item) {
        return false;
      }

      return criterion.check({ ...item, itemId: criterion.itemId });
    } else if (
      criterion instanceof MinimumItemTagPurchaseCriterion ||
      criterion instanceof ItemTagPurchaseBetweenCriterion
    ) {
      const tagPurchase = against.tags[criterion.tag.toString()];
      const includedTag = criterion.tagCriteria?.includedTag;
      const includedTagPurchase = includedTag
        ? against.tags[includedTag.toString()]
        : undefined;

      return criterion.check({
        tagPurchase: { ...tagPurchase, tag: criterion.tag },
        itemPurchase: against.items,
        includedTagPurchase:
          includedTag && includedTagPurchase
            ? { ...includedTagPurchase, tag: includedTag }
            : undefined,
      });
    }

    return false;
  }
}
