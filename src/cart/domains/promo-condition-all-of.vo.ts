import { ValueObject } from '@wings-corporation/domain';
import { PromoConditionType } from '@wings-online/app.constants';
import {
  IPromotionCondition,
  PurchaseSummary,
} from '@wings-online/cart/interfaces/promotion.interface';
import { PromoCriterionUtil } from '@wings-online/common/utils/promo-criterion.util';

import { PromoBenefit } from './promo-benefit.vo';
import { PromoCriterionWithoutBenefit } from './promo-criteria.vo';

type PromotionConditionAllOfProps = {
  criteria: PromoCriterionWithoutBenefit[];
  benefit: PromoBenefit;
};

export class PromotionConditionAllOf
  extends ValueObject<PromotionConditionAllOfProps>
  implements IPromotionCondition
{
  constructor(props: PromotionConditionAllOfProps) {
    super(props);
  }

  public static create(
    props: PromotionConditionAllOfProps,
  ): PromotionConditionAllOf {
    return new PromotionConditionAllOf(props);
  }

  get type(): PromoConditionType {
    return PromoConditionType.AllOf;
  }

  get criteria(): PromoCriterionWithoutBenefit[] {
    return this._value.criteria;
  }

  get benefitInfo(): PromoBenefit {
    return this._value.benefit;
  }

  benefitOf(purchase: PurchaseSummary): PromoBenefit | undefined {
    if (
      !this.criteria.every((x) =>
        PromoCriterionUtil.check(x.criterion, purchase),
      )
    ) {
      return undefined;
    }

    return this._value.benefit;
  }
}
