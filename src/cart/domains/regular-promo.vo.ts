import { Nullable } from '@wings-corporation/core';
import { ValueObject } from '@wings-corporation/domain';
import { PromotionType } from '@wings-online/app.constants';

import { PromotionConditionExactlyOne } from './promo-condition-exactly-one.vo';
import {
  MinimumItemPurchaseCriterion,
  MinimumItemTagPurchaseCriterion,
} from './promo-criteria.vo';
import { Tag } from './tag.vo';

export type RegularPromoProps = {
  condition: PromotionConditionExactlyOne<
    MinimumItemPurchaseCriterion | MinimumItemTagPurchaseCriterion
  >;
  priority: number;
  externalId: Nullable<string>;
};

export class RegularPromo extends ValueObject<RegularPromoProps> {
  private constructor(props: RegularPromoProps) {
    super(props);
  }

  public static create(props: RegularPromoProps): RegularPromo {
    return new RegularPromo(props);
  }

  get type(): string {
    return PromotionType.WINGS_ONLINE;
  }

  get benefit() {
    return this._value.condition.benefitInfo;
  }

  get priority() {
    return this._value.priority;
  }

  get targetPriority() {
    return this._value.priority;
  }

  get externalId(): string | null {
    return this._value.externalId;
  }

  get tag(): Tag | undefined {
    if (
      !(this._value.condition.criteria instanceof MinimumItemPurchaseCriterion)
    ) {
      return this._value.condition.criteria.tag;
    }

    return undefined;
  }
}
