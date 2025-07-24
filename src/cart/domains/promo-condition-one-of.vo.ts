import { ValueObject } from '@wings-corporation/domain';
import { PromoConditionType } from '@wings-online/app.constants';
import {
  IPromotionCondition,
  PurchaseSummary,
} from '@wings-online/cart/interfaces/promotion.interface';
import { PromoCriterionUtil } from '@wings-online/common/utils/promo-criterion.util';

import { PromoBenefit } from './promo-benefit.vo';
import { PromoCriterionWithBenefit } from './promo-criteria.vo';

type PromotionConditionOneOfProps = {
  criteria: PromoCriterionWithBenefit[];
};

export class PromotionConditionOneOf
  extends ValueObject<PromotionConditionOneOfProps>
  implements IPromotionCondition
{
  public static create(
    props: PromotionConditionOneOfProps,
  ): PromotionConditionOneOf {
    return new PromotionConditionOneOf(props);
  }

  get type(): PromoConditionType {
    return PromoConditionType.OneOf;
  }

  get criteria(): PromoCriterionWithBenefit[] {
    return this._value.criteria;
  }

  benefitOf(purchase: PurchaseSummary): PromoBenefit | undefined {
    for (const criteriaItem of this.criteria) {
      const { criterion, benefit } = criteriaItem;

      if (PromoCriterionUtil.check(criterion, purchase)) {
        return benefit;
      }
    }

    return undefined;
  }
}
