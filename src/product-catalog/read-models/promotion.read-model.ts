import { uniq } from 'lodash';

import { Nullable } from '@wings-corporation/core';
import { UomType } from '@wings-online/app.constants';
import { PackQty } from '@wings-online/cart/domains';
import {
  PromoUtil,
  SalesUtil,
  TagCriteria,
  UomConversion,
} from '@wings-online/common';

export type PromotionCondition =
  | MinimumPurchaseCondition
  | MinimumPurchaseAmountCondition;
export type StrataPromotionCondition = PromotionCondition;
export type DirectPromotionCondition = MinimumPurchaseCondition;

export type MinimumPurchaseCondition = {
  promotionIds: Array<string>;
  priorities: Array<number>;
  minQty: number;
  minQtyUomType: UomType;
  benefit: PromotionBenefit;
  tagCriteria?: TagCriteria;
};

export type MinimumPurchaseAmountCondition = {
  promotionIds: Array<string>;
  priorities: Array<number>;
  minAmount: number;
  benefit: PromotionBenefit;
};

export type PromotionBenefit = {
  discount: Benefit[];
  coin: Benefit[];
  product: Nullable<ProductBenefit>;
  maxQty?: number;
  maxUomType?: UomType;
};

export type PercentageBenefit = {
  type: 'PERCENTAGE';
  value: number;
};

export type AmountBenefit = {
  type: 'AMOUNT';
  value: number;
  scaleUomType: UomType;
};

export type Benefit = PercentageBenefit | AmountBenefit;
export type ProductBenefit = {
  type: 'FREE_PRODUCT';
  id: string;
  name: Nullable<string>;
  benefitQty: number;
  benefitUom: UomType;
  uom: {
    base: UomType;
    baseQty: PackQty;
    intermediate: Nullable<UomType>;
    intermediateQty: Nullable<PackQty>;
    pack: Nullable<UomType>;
    packQty: Nullable<PackQty>;
  };
  scaleQty: number;
  scaleUomType: UomType;
};

type PromotionReadModelProps = {
  id: string;
  priority: number;
  type: PromotionType;
  target: {
    itemId: string;
    tag: string;
    brands?: string[];
    priority: number;
  };
  isRegular?: boolean;
  externalId: string;
  externalType: string;
};

type PromotionType = 'DIRECT' | 'STRATA';

export const isDirectPromotion = (
  promotion: PromotionReadModel,
): promotion is DirectPromotionReadModel => {
  return promotion['benefit'] !== undefined;
};

export const isStrataPromotion = (
  promotion: PromotionReadModel,
): promotion is StrataPromotionReadModel => {
  return promotion['benefit'] === undefined;
};

export const isMinimumPurchaseCondition = (
  condition: StrataPromotionCondition,
): condition is MinimumPurchaseCondition => {
  return condition['minQty'] !== undefined;
};

export const isMinimumPurchaseAmountCondition = (
  condition: StrataPromotionCondition,
): condition is MinimumPurchaseAmountCondition => {
  return condition['minAmount'] !== undefined;
};

export class DirectPromotionReadModel {
  private _condition: MinimumPurchaseCondition;

  constructor(private readonly props: PromotionReadModelProps) {}

  get id() {
    return this.props.id;
  }

  get externalId() {
    return this.props.externalId;
  }

  get externalType() {
    return this.props.externalType;
  }

  get priority() {
    return this.props.priority;
  }

  get type() {
    return this.props.type;
  }

  get benefit() {
    return this._condition.benefit;
  }

  get condition() {
    return this._condition;
  }

  get tagCriteria(): TagCriteria | undefined {
    return this._condition.tagCriteria;
  }

  get target() {
    return this.props.target;
  }

  get coinType() {
    return this.benefit.coin.some((coin) => coin.type === 'PERCENTAGE')
      ? 'PERCENTAGE'
      : 'AMOUNT';
  }

  get isRegular(): boolean {
    return this.props.isRegular || false;
  }

  public setCondition(condition: MinimumPurchaseCondition) {
    this._condition = condition;
  }

  private isCombineable(that: PromotionReadModel): boolean {
    // must be the same type
    if (!isDirectPromotion(that)) {
      return false;
    }

    if (this._condition.tagCriteria || that._condition.tagCriteria) {
      return false;
    }

    if (this.target.tag !== that.target.tag) return false;
    if (this.target.itemId !== that.target.itemId) return false;
    if (this.benefit.product || that.benefit.product) return false;

    // both have benefit
    if (this.benefit && that.benefit) {
      return PromoUtil.isBenefitCombineable(this.benefit, that.benefit);
    }

    return false;
  }

  public tryCombine(
    that: PromotionReadModel,
  ): DirectPromotionReadModel | false {
    if (!this.isCombineable(that)) return false;
    try {
      return this.combine(that as DirectPromotionReadModel);
    } catch (err) {
      return false;
    }
  }

  public combine(that: DirectPromotionReadModel) {
    if (!this.isCombineable(that))
      throw new Error('promotion cannot be combined');

    const discounts =
      this.priority < that.priority
        ? [...this.benefit.discount, ...that.benefit.discount]
        : [...that.benefit.discount, ...this.benefit.discount];

    this._condition.benefit.discount = discounts;

    const coins =
      this.priority < that.priority
        ? [...this.benefit.coin, ...that.benefit.coin]
        : [...that.benefit.coin, ...this.benefit.coin];

    this._condition.benefit.coin = coins;

    this._condition.promotionIds = Array.from(
      new Set([...this._condition.promotionIds, this.id, that.id]),
    );

    this._condition.priorities = Array.from(
      new Set([...this._condition.priorities, this.priority, that.priority]),
    ).sort();

    return this;
  }

  public setBrands(brands: string[]) {
    if (this.props.target.tag !== '*') {
      this.props.target.brands = brands;
    }
  }

  public setIncludedTagBrands(brands: string[]) {
    if (this.tagCriteria?.includedTag) {
      this.tagCriteria.includedTagBrands = brands;
    }
  }
}

export abstract class BaseStrataPromotionReadModel<
  T extends StrataPromotionCondition,
> {
  protected _conditions: T[];

  constructor(private readonly props: PromotionReadModelProps) {
    this._conditions = [];
  }

  get id() {
    return this.props.id;
  }

  get externalId() {
    return this.props.externalId;
  }

  get priority() {
    return this.props.priority;
  }

  get type() {
    return this.props.type;
  }

  get target() {
    return this.props.target;
  }

  get isRegular(): boolean {
    return false;
  }

  get externalType() {
    return this.props.externalType;
  }

  get tagCriteria(): TagCriteria | undefined {
    const condition = this.conditions[0];
    return condition && isMinimumPurchaseCondition(condition)
      ? condition.tagCriteria
      : undefined;
  }

  get highestCondition(): T {
    return this._conditions[this._conditions.length - 1];
  }

  abstract get conditions(): T[];

  protected abstract isCombineable(that: PromotionReadModel): boolean;

  public tryCombine(that: PromotionReadModel): PromotionReadModel | false {
    if (!this.isCombineable(that)) return false;
    try {
      return this.combine(that);
    } catch (err) {
      return false;
    }
  }

  public addCondition(condition: T) {
    this._conditions.push(condition);
    this.sortConditions();
  }

  public abstract combine(that: PromotionReadModel): PromotionReadModel;

  public setBrands(brands: string[]) {
    if (this.props.target.tag !== '*') {
      this.props.target.brands = brands;
    }
  }

  public setIncludedTagBrands(brands: string[]) {
    if (this.tagCriteria?.includedTag) {
      this.tagCriteria.includedTagBrands = brands;
    }
  }

  protected abstract sortConditions(): void;
}

export class StrataQtyPromotionReadModel extends BaseStrataPromotionReadModel<MinimumPurchaseCondition> {
  private _uomConversion?: UomConversion;

  get conditions() {
    return this._conditions;
  }

  get highestCondition(): MinimumPurchaseCondition {
    return this._conditions.reduce((prev, current) =>
      current.minQty > prev.minQty ? current : prev,
    );
  }

  isCombineable(that: PromotionReadModel): boolean {
    // must be the same type
    if (!isStrataPromotion(that)) {
      return false;
    }

    if (!(that instanceof StrataQtyPromotionReadModel)) return false;

    if (this.tagCriteria || that.tagCriteria) {
      return false;
    }

    // must have the same target
    if (this.target.tag !== that.target.tag) return false;
    if (this.target.itemId !== that.target.itemId) return false;

    // eaxh condition must have the same benefit type, maxQty, maxUomType, and scaleUomType
    for (const a of this.conditions) {
      for (const b of that.conditions) {
        if (!PromoUtil.isBenefitCombineable(a.benefit, b.benefit)) {
          return false;
        }
      }
    }

    return true;
  }

  public combine(that: PromotionReadModel) {
    if (
      !this.isCombineable(that) ||
      !isStrataPromotion(that) ||
      !(that instanceof StrataQtyPromotionReadModel)
    )
      throw new Error('promotion cannot be combined');

    // determine the promotion with the higher minimum quantity condition as promoA,
    // and assign the promotion with the lower minimum quantity as promoB.
    const [promoA, promoB] =
      this.getConditionMinQtyInBase(this.highestCondition) >
      this.getConditionMinQtyInBase(that.highestCondition)
        ? [this, that]
        : [that, this];
    const isPromoAPriorityHigher = promoA.priority < promoB.priority;

    const newConditions: MinimumPurchaseCondition[] = [];
    promoA.conditions.forEach((a, idx) => {
      // get the previous condition in promoA for possible merging with promoB conditions
      const prevCondition = idx > 0 ? promoA.conditions[idx - 1] : undefined;

      // filter conditions from promoB where minQty is less than or equal to the current condition in promoA
      const conditions = promoB.conditions.filter(
        (c) =>
          this.getConditionMinQtyInBase(c) <= this.getConditionMinQtyInBase(a),
      );

      // get the highest (last) condition from promoB that matches the current minQty in promoA
      const topCondition = conditions[conditions.length - 1];

      // push conditions from promoB with minQty between the previous and current promoA condition's minQty
      // merged with the previous promoA condition if available
      if (
        topCondition &&
        this.getConditionMinQtyInBase(topCondition) ===
          this.getConditionMinQtyInBase(a)
      ) {
        conditions.pop();
      }
      conditions.forEach((c) => {
        if (
          !prevCondition ||
          this.getConditionMinQtyInBase(c) >
            this.getConditionMinQtyInBase(prevCondition)
        ) {
          const discount = prevCondition
            ? isPromoAPriorityHigher
              ? [...prevCondition.benefit.discount, ...c.benefit.discount]
              : [...c.benefit.discount, ...prevCondition.benefit.discount]
            : c.benefit.discount;
          const coin = prevCondition
            ? isPromoAPriorityHigher
              ? [...prevCondition.benefit.coin, ...c.benefit.coin]
              : [...c.benefit.coin, ...prevCondition.benefit.coin]
            : c.benefit.coin;
          const promotionIds = prevCondition
            ? isPromoAPriorityHigher
              ? [...prevCondition.promotionIds, ...c.promotionIds]
              : [...c.promotionIds, ...prevCondition.promotionIds]
            : c.promotionIds;
          const priorities = prevCondition
            ? isPromoAPriorityHigher
              ? [...prevCondition.priorities, ...c.priorities]
              : [...c.priorities, ...prevCondition.priorities]
            : c.priorities;
          newConditions.push({
            ...c,
            promotionIds: uniq(promotionIds),
            priorities: uniq(priorities),
            benefit: {
              ...c.benefit,
              discount,
              coin,
            },
          });
        }
      });

      // push the current promoA condition, merged with topCondition if available
      if (topCondition) {
        const discount = isPromoAPriorityHigher
          ? [...a.benefit.discount, ...topCondition.benefit.discount]
          : [...topCondition.benefit.discount, ...a.benefit.discount];
        const coin = isPromoAPriorityHigher
          ? [...a.benefit.coin, ...topCondition.benefit.coin]
          : [...topCondition.benefit.coin, ...a.benefit.coin];
        const promotionIds = isPromoAPriorityHigher
          ? [...a.promotionIds, ...topCondition.promotionIds]
          : [...topCondition.promotionIds, ...a.promotionIds];
        const priorities = isPromoAPriorityHigher
          ? [...a.priorities, ...topCondition.priorities]
          : [...topCondition.priorities, ...a.priorities];
        newConditions.push({
          ...a,
          promotionIds: uniq(promotionIds),
          priorities: uniq(priorities),
          benefit: { ...a.benefit, discount, coin },
        });
      } else {
        newConditions.push(a);
      }
    });

    this._conditions = newConditions;

    return this;
  }

  setUomConversion(uomConversion: UomConversion) {
    this._uomConversion = uomConversion;
    this.sortConditions();
  }

  protected sortConditions() {
    this._conditions = this._conditions.sort((a, b) => {
      return this._uomConversion
        ? SalesUtil.convertQtyToBaseQty(
            a.minQty,
            a.minQtyUomType,
            this._uomConversion,
          ).value -
            SalesUtil.convertQtyToBaseQty(
              b.minQty,
              b.minQtyUomType,
              this._uomConversion,
            ).value
        : a.minQty - b.minQty;
    });
  }

  private getConditionMinQtyInBase(condition: MinimumPurchaseCondition) {
    return this._uomConversion
      ? SalesUtil.convertQtyToBaseQty(
          condition.minQty,
          condition.minQtyUomType,
          this._uomConversion,
        ).value
      : condition.minQty;
  }
}

export class StrataAmountPromotionReadModel extends BaseStrataPromotionReadModel<MinimumPurchaseAmountCondition> {
  constructor(
    props: PromotionReadModelProps & {
      target: {
        itemId: string;
        priority: number;
      };
    },
  ) {
    super(props);
  }

  get conditions() {
    return this._conditions.sort((a, b) => a.minAmount - b.minAmount);
  }

  isCombineable(that: PromotionReadModel): boolean {
    return false;
  }

  public combine(that: PromotionReadModel) {
    return this;
  }

  protected sortConditions(): void {
    this._conditions = this._conditions.sort((a, b) => {
      return a.minAmount - b.minAmount;
    });
  }
}

export type StrataPromotionReadModel =
  | StrataQtyPromotionReadModel
  | StrataAmountPromotionReadModel;

export type PromotionReadModel =
  | DirectPromotionReadModel
  | StrataPromotionReadModel;

export type LifetimePromotionReadModel =
  | DirectPromotionReadModel
  | StrataQtyPromotionReadModel;
