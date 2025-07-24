import { ValueObject } from '@wings-corporation/domain';
import { PromoConditionType } from '@wings-online/app.constants';
import {
  IPromotionCondition,
  PurchaseSummary,
} from '@wings-online/cart/interfaces/promotion.interface';
import { PromoCriterionUtil } from '@wings-online/common/utils/promo-criterion.util';

import { PromoBenefit } from './promo-benefit.vo';
import { Criterion } from './promo-criteria.vo';

type PromotionConditionExactlyOneProps<TCriterion extends Criterion> = {
  criteria: TCriterion;
  benefit: PromoBenefit;
};

export class PromotionConditionExactlyOne<
    TCriterion extends Criterion = Criterion,
  >
  extends ValueObject<PromotionConditionExactlyOneProps<TCriterion>>
  implements IPromotionCondition
{
  public static create<TCriterion extends Criterion>(
    props: PromotionConditionExactlyOneProps<TCriterion>,
  ): PromotionConditionExactlyOne<TCriterion> {
    return new PromotionConditionExactlyOne(props);
  }

  get type(): PromoConditionType {
    return PromoConditionType.OneOf;
  }

  get criteria(): TCriterion {
    return this._value.criteria;
  }

  get benefitInfo(): PromoBenefit {
    return this._value.benefit;
  }

  benefitOf(purchase: PurchaseSummary): PromoBenefit | undefined {
    if (PromoCriterionUtil.check(this.criteria, purchase))
      return this._value.benefit;

    return undefined;
  }
}
