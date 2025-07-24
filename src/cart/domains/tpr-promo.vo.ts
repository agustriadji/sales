import { ValueObject } from '@wings-corporation/domain';
import { PromotionType } from '@wings-online/app.constants';
import { PurchaseSummary } from '@wings-online/cart/interfaces/promotion.interface';

import { PromotionConditionOneOf } from './promo-condition-one-of.vo';
import {
  ItemTagPurchaseBetweenCriterion,
  MinimumItemTagPurchaseCriterion,
} from './promo-criteria.vo';

export type TPRPromoProps = {
  condition: PromotionConditionOneOf;
  priority: number;
  externalType: string;
  targetPriority: number;
  targetTag: string;
  targetId: string;
};

export class TPRPromo extends ValueObject<TPRPromoProps> {
  private constructor(props: TPRPromoProps) {
    super(props);
  }

  public static create(props: TPRPromoProps): TPRPromo {
    return new TPRPromo(props);
  }

  get priority() {
    return this._value.priority;
  }

  get type(): string {
    return PromotionType.TPR;
  }

  get externalType(): string {
    return this._value.externalType;
  }

  get targetPriority() {
    return this._value.targetPriority;
  }

  get targetTag(): string {
    return this._value.targetTag;
  }

  get condition() {
    return this._value.condition;
  }

  get externalId(): null {
    return null;
  }

  get targetId(): string {
    return this._value.targetId;
  }

  get tagCriteria() {
    const criterion = this._value.condition.criteria[0].criterion;
    return criterion instanceof MinimumItemTagPurchaseCriterion ||
      criterion instanceof ItemTagPurchaseBetweenCriterion
      ? criterion.tagCriteria
      : undefined;
  }

  benefit(purchase: PurchaseSummary) {
    return this._value.condition.benefitOf(purchase);
  }
}
