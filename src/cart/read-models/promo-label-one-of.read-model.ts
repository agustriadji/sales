import {
  Benefit,
  CartItemReadModel,
  JsonTPRStrataLabelProps,
  PromoLabelKey,
  PromoLabelReadModelProps,
} from '.';
import { sumBy } from 'lodash';

import { Nullable } from '@wings-corporation/core';
import { EntityId, Money, Quantity } from '@wings-corporation/domain';
import { UomType, UomTypeEnum } from '@wings-online/app.constants';
import {
  CoinBenefit,
  DiscountBenefit,
  MinimumPurchaseAmountCriterion,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
  PromoUtil,
  PurchaseAmountBetweenCriterion,
  PurchaseQtyBetweenByTagCriterion,
  PurchaseQtyBetweenCriterion,
  ReadModel,
  TagCriteria,
} from '@wings-online/common';

import { Tag } from '../domains';
import {
  ItemPromo,
  ItemPromoCriteriaWithBenefit,
  PromoConditionOneOf,
  TprStrataPromo,
  TprStrataPromoCondition,
} from '../promotion';
import { TagPromoCriterion } from '../promotion/interfaces/promotion.interface';
import { CartUtils } from '../utils/cart.utils';
import { TagCartQuantity } from './cart-qty.read-model';
import { ItemReadModel } from './item.read-model';

type CriteriaType = 'QTY' | 'AMOUNT';

interface PromoLabelOneOfReadModelProps extends PromoLabelReadModelProps {
  key: PromoLabelKey & {
    type: 'TPR_STRATA';
    criteriaType: CriteriaType;
  };
}

type PromoLabelOneOfCriteria = {
  applied: boolean;
  priorities: number[];
  minQty?: number;
  minUomType?: UomType;
  minPurchase?: number;
  offer: number;
  benefits: Array<Benefit>;
  tagCriteria?: TagCriteria;
  coinOffer: number;
  coinAmount: number;
};

export class PromoLabelOneOfReadModel extends ReadModel {
  private _criteria: PromoLabelOneOfCriteria[] = [];

  constructor(readonly props: PromoLabelOneOfReadModelProps) {
    super();
  }
  static fromItemPromotion(props: {
    item: CartItemReadModel;
    price: Money;
    coinPrice: Money;
    promo: TprStrataPromo;
    applied: boolean;
  }): PromoLabelOneOfReadModel | undefined {
    const { item, price, coinPrice, promo, applied } = props;
    const condition = promo.condition;

    if (
      !condition.criteria[0].benefit.discount ||
      !condition.criteria[0].benefit.discount.value
    ) {
      return;
    }

    const criterion = condition.criteria[0].criterion;
    const label = new PromoLabelOneOfReadModel({
      id: promo.id,
      applied,
      key: {
        id: condition.id,
        item,
        itemPrice: price.value,
        coinPrice: coinPrice.value,
        tag:
          criterion instanceof PurchaseQtyBetweenByTagCriterion ||
          criterion instanceof MinimumPurchaseQtyByTagCriterion
            ? criterion.tag.toString()
            : undefined,
        type: 'TPR_STRATA',
        criteriaType: PromoUtil.isAmountCriterion(criterion) ? 'AMOUNT' : 'QTY',
      },
    });

    label.addPromotion(promo, applied);
    return label;
  }

  get id(): EntityId<string> {
    return this.props.id;
  }

  get key(): PromoLabelKey {
    return this.props.key;
  }

  get isEmpty(): boolean {
    return this._criteria.length === 0;
  }

  get item(): ItemReadModel {
    return this.props.key.item.item;
  }

  get itemPrice(): number {
    return this.props.key.itemPrice;
  }

  get coinPrice(): number {
    return this.props.key.coinPrice;
  }

  get applied(): boolean {
    return this.props.applied;
  }

  get minQty(): number {
    if (this._criteria[0].minQty) return this._criteria[0].minQty;

    return Math.ceil((this._criteria[0].minPurchase || 1) / this.itemPrice);
  }

  get cartItem(): CartItemReadModel {
    return this.props.key.item;
  }

  get hasTagCriteria(): boolean {
    return !!this._criteria[0].tagCriteria;
  }

  get highestCondition(): PromoLabelOneOfCriteria | undefined {
    if (!this._criteria.length) return undefined;
    return this._criteria.reduce((prev, current) => {
      if (current.minQty && prev.minQty) {
        return current.minQty > prev.minQty ? current : prev;
      }

      if (current.minPurchase && prev.minPurchase) {
        return current.minPurchase > prev.minPurchase ? current : prev;
      }

      return prev;
    });
  }

  setApplied(): void {
    this.props.applied = true;
  }

  setUnapplied(): void {
    this.props.applied = false;
  }

  private isMatch(promotion: ItemPromo): boolean {
    if (promotion.id.equals(this.props.id)) return true;

    const criterion = promotion.condition.criteria[0].criterion;

    const isAmountCriterion = PromoUtil.isAmountCriterion(criterion);

    // use different label for each promo with amount criteria
    if (this.props.key.criteriaType === 'AMOUNT' || isAmountCriterion) {
      return false;
    }

    if (promotion.tagCriteria) return false;
    if (promotion.condition.type !== 'OneOf') return false;

    if (this.key.tag !== (criterion as TagPromoCriterion).tag?.toString()) {
      return false;
    }

    const allCriteriaMatchUom = this._criteria.every((criteria) => {
      if (criterion['uomType'] !== criteria.minUomType) {
        return false;
      }

      return criteria.benefits.every((benefit) => {
        if (benefit.type === 'AMOUNT') {
          const isUomMismatched = (
            promotion.condition as TprStrataPromoCondition
          ).criteria.some((x) => {
            return (
              x.benefit.discount?.type === 'AMOUNT' &&
              x.benefit.discount.scaleUomType !== benefit.uomType
            );
          });

          return !isUomMismatched;
        } else {
          return true;
        }
      });
    });

    if (!allCriteriaMatchUom) {
      return false;
    }

    return true;
  }

  addPromotion(promotion: ItemPromo, applied: boolean): boolean {
    if (this.isMatch(promotion)) {
      const condition = promotion.condition as PromoConditionOneOf;

      if (this.props.key.criteriaType === 'QTY') {
        this._criteria = this.recursiveMergeCriteria(
          [],
          undefined,
          undefined,
          this._criteria,
          condition.criteria,
          promotion.priority,
        );
      } else {
        this._criteria = condition.criteria.map((c) =>
          this.mapCriteriaToLabelCriteria(c, promotion.priority),
        );
      }

      if (this.applied && !applied) {
        this.setUnapplied();
      }

      return true;
    }
    return false;
  }

  private recursiveMergeCriteria(
    prev: PromoLabelOneOfCriteria[],
    c1LatestCriteria: PromoLabelOneOfCriteria | undefined,
    c2LatestCriteria: ItemPromoCriteriaWithBenefit | undefined,
    criteria1: PromoLabelOneOfCriteria[],
    criteria2: ItemPromoCriteriaWithBenefit[],
    criteria2Priority: number,
  ): PromoLabelOneOfCriteria[] {
    if (!criteria1 && !criteria2.length) {
      return prev;
    }

    if (!criteria1.length) {
      return prev.concat(
        criteria2.map((c) => {
          const labelCriteria = this.mapCriteriaToLabelCriteria(
            c,
            criteria2Priority,
          );
          const coinPrice = c1LatestCriteria
            ? Money.create(c1LatestCriteria.coinOffer)
            : Money.create(this.coinPrice);
          const coinAmount = c.benefit.coin
            ? this.calculateCoin(coinPrice, c.benefit.coin)
            : Money.zero();
          return {
            ...labelCriteria,
            priorities: (c1LatestCriteria?.priorities || []).concat(
              labelCriteria.priorities,
            ),
            offer: this.calculateOffer(
              c.benefit.discount!,
              c1LatestCriteria
                ? Money.create(c1LatestCriteria.offer)
                : Money.create(this.itemPrice),
            ).value,
            benefits: (c1LatestCriteria?.benefits || []).concat(
              labelCriteria.benefits,
            ),
            coinAmount: (c1LatestCriteria?.coinAmount || 0) + coinAmount.value,
            coinOffer: PromoUtil.resolveOfferedPrice(coinPrice, coinAmount)
              .value,
          };
        }),
      );
    } else if (!criteria2.length) {
      const criteria2Label = c2LatestCriteria
        ? this.mapCriteriaToLabelCriteria(c2LatestCriteria, criteria2Priority)
        : undefined;
      return prev.concat(
        criteria1.map((c) => {
          const coinPrice = Money.create(c.coinOffer);
          const coinAmount =
            c2LatestCriteria && c2LatestCriteria.benefit.coin
              ? this.calculateCoin(coinPrice, c2LatestCriteria.benefit.coin)
              : Money.zero();
          return {
            ...c,
            priorities: c.priorities.concat(criteria2Label?.priorities || []),
            offer: c2LatestCriteria
              ? this.calculateOffer(
                  c2LatestCriteria.benefit.discount!,
                  Money.create(c.offer),
                ).value
              : c.offer,
            benefits: c.benefits.concat(criteria2Label?.benefits || []),
            coinAmount: c.coinAmount + coinAmount.value,
            coinOffer: PromoUtil.resolveOfferedPrice(coinPrice, coinAmount)
              .value,
          };
        }),
      );
    } else {
      const firstCriteria2Label = this.mapCriteriaToLabelCriteria(
        criteria2[0],
        criteria2Priority,
      );
      if ((firstCriteria2Label.minQty || 1) < (criteria1[0].minQty || 1)) {
        const coinPrice = Money.create(
          c1LatestCriteria?.coinOffer || this.coinPrice,
        );
        const coinAmount = criteria2[0].benefit.coin
          ? this.calculateCoin(coinPrice, criteria2[0].benefit.coin)
          : Money.zero();
        return this.recursiveMergeCriteria(
          prev.concat({
            ...firstCriteria2Label,
            priorities: (c1LatestCriteria?.priorities || []).concat(
              firstCriteria2Label.priorities,
            ),
            offer: this.calculateOffer(
              criteria2[0].benefit.discount!,
              Money.create(c1LatestCriteria?.offer || this.itemPrice),
            ).value,
            benefits: (c1LatestCriteria?.benefits || []).concat(
              firstCriteria2Label.benefits,
            ),
            coinAmount: (c1LatestCriteria?.coinAmount || 0) + coinAmount.value,
            coinOffer: PromoUtil.resolveOfferedPrice(coinPrice, coinAmount)
              .value,
          }),
          c1LatestCriteria,
          criteria2[0],
          criteria1,
          criteria2.slice(1),
          criteria2Priority,
        );
      } else if (firstCriteria2Label.minQty === criteria1[0].minQty) {
        const coinPrice = Money.create(criteria1[0].coinOffer);
        const coinAmount = criteria2[0].benefit.coin
          ? this.calculateCoin(coinPrice, criteria2[0].benefit.coin)
          : Money.zero();
        return this.recursiveMergeCriteria(
          prev.concat({
            ...firstCriteria2Label,
            priorities: criteria1[0].priorities.concat(
              firstCriteria2Label.priorities,
            ),
            offer: this.calculateOffer(
              criteria2[0].benefit.discount!,
              Money.create(criteria1[0].offer),
            ).value,
            benefits: criteria1[0].benefits.concat(
              firstCriteria2Label.benefits,
            ),
            coinAmount: criteria1[0].coinAmount + coinAmount.value,
            coinOffer: PromoUtil.resolveOfferedPrice(coinPrice, coinAmount)
              .value,
          }),
          criteria1[0],
          criteria2[0],
          criteria1.slice(1),
          criteria2.slice(1),
          criteria2Priority,
        );
      } else {
        const coinPrice = Money.create(criteria1[0].coinOffer);
        const coinAmount =
          c2LatestCriteria && c2LatestCriteria.benefit.coin
            ? this.calculateCoin(coinPrice, c2LatestCriteria.benefit.coin)
            : Money.zero();
        return this.recursiveMergeCriteria(
          prev.concat({
            ...criteria1[0],
            offer: c2LatestCriteria
              ? this.calculateOffer(
                  c2LatestCriteria.benefit.discount!,
                  Money.create(criteria1[0].offer),
                ).value
              : criteria1[0].offer,
            priorities: c2LatestCriteria
              ? criteria1[0].priorities.concat(criteria2Priority)
              : criteria1[0].priorities,
            benefits: c2LatestCriteria
              ? criteria1[0].benefits.concat({
                  type: c2LatestCriteria.benefit.discount!.type,
                  value: c2LatestCriteria.benefit.discount!.value.value,
                  uomType: c2LatestCriteria.benefit.discount!.scaleUomType,
                })
              : criteria1[0].benefits,
            coinAmount: criteria1[0].coinAmount + coinAmount.value,
            coinOffer: PromoUtil.resolveOfferedPrice(coinPrice, coinAmount)
              .value,
          }),
          criteria1[0],
          c2LatestCriteria,
          criteria1.slice(1),
          criteria2,
          criteria2Priority,
        );
      }
    }
  }

  private mapCriteriaToLabelCriteria(
    criteria: ItemPromoCriteriaWithBenefit,
    priority: number,
  ): PromoLabelOneOfCriteria {
    let minQty: undefined | number;
    let uomType: UomType | undefined;

    let minPurchase: undefined | number;

    let tagCriteria: TagCriteria | undefined;

    const discount = criteria.benefit.discount!;

    if (
      criteria.criterion instanceof MinimumPurchaseQtyByTagCriterion ||
      criteria.criterion instanceof PurchaseQtyBetweenByTagCriterion
    ) {
      tagCriteria = criteria.criterion.tagCriteria;
    }

    if (
      criteria.criterion instanceof MinimumPurchaseQtyCriterion ||
      criteria.criterion instanceof MinimumPurchaseQtyByTagCriterion
    ) {
      minQty = criteria.criterion.qty.value || 1;
      uomType = criteria.criterion.uomType || UomTypeEnum.BASE;
    } else if (
      criteria.criterion instanceof PurchaseQtyBetweenCriterion ||
      criteria.criterion instanceof PurchaseQtyBetweenByTagCriterion
    ) {
      minQty = criteria.criterion.from.value || 1;
      uomType = criteria.criterion.uomType || UomTypeEnum.BASE;
    } else if (criteria.criterion instanceof MinimumPurchaseAmountCriterion) {
      minPurchase = criteria.criterion.amount.value;
    } else if (criteria.criterion instanceof PurchaseAmountBetweenCriterion) {
      minPurchase = criteria.criterion.from.value;
    }

    const price = Money.create(this.itemPrice);
    const coinPrice = Money.create(this.coinPrice);
    const coinAmount = criteria.benefit.coin
      ? this.calculateCoin(coinPrice, criteria.benefit.coin)
      : Money.zero();

    return {
      applied:
        !this.cartItem.regularQty.equals(Quantity.zero()) &&
        CartUtils.checkAgainstCriteria(criteria, this.cartItem),
      priorities: [priority],
      minQty: minQty,
      minUomType: uomType,
      minPurchase,
      offer: this.calculateOffer(discount, price).value,
      benefits: [
        {
          type: discount.type,
          value: discount.value.value,
          uomType: discount.scaleUomType,
        },
      ],
      coinAmount: coinAmount.value,
      coinOffer: PromoUtil.resolveOfferedPrice(coinPrice, coinAmount).value,
      tagCriteria,
    };
  }

  private calculateOffer(discount: DiscountBenefit, price: Money): Money {
    if (discount.type === 'PERCENTAGE') {
      return PromoUtil.resolveOfferedPrice(
        price,
        PromoUtil.resolvePercentageBenefit(discount, price),
      );
    } else {
      return PromoUtil.resolveOfferedPrice(
        price,
        PromoUtil.resolveAmountBenefit(discount, {
          baseQty: Quantity.create(this.item.baseQty),
          packQty: Quantity.create(this.item.packQty),
        }),
      );
    }
  }

  private calculateCoin(price: Money, coin: CoinBenefit): Money {
    return coin.type === 'PERCENTAGE'
      ? PromoUtil.resolvePercentageBenefit(coin, price)
      : PromoUtil.resolveAmountBenefit(coin, {
          baseQty: Quantity.create(this.item.baseQty),
          packQty: Quantity.create(this.item.packQty),
        });
  }

  private getPreviousQty(tag: Nullable<TagCartQuantity>): number {
    if (!tag) return 0;

    const itemDate = this.cartItem.addedAt;

    return sumBy(
      tag.items.filter((i) => i.addedAt < itemDate),
      (i) => i.qty.value,
    );
  }

  toJSON(): JsonTPRStrataLabelProps {
    const tagSummary = this.key.tag
      ? this.cartItem.cartQty.byTag(Tag.fromString(this.key.tag))
      : null;

    const includedTagSummary = this._criteria[0].tagCriteria?.includedTag
      ? this.cartItem.cartQty.byTag(this._criteria[0].tagCriteria.includedTag)
      : null;

    return {
      applied: this.props.applied,
      tag: this.key.tag || null,
      tag_qty: tagSummary
        ? {
            base: tagSummary.qty.value,
            item_combination: tagSummary.items.length,
            previous_qty: this.getPreviousQty(tagSummary),
          }
        : null,
      tag_criteria:
        tagSummary && this._criteria[0].tagCriteria
          ? {
              min_qty: this._criteria[0].minQty || 1,
              min_qty_uom_type:
                this._criteria[0].minUomType || UomTypeEnum.BASE,
              min_item_combination:
                this._criteria[0].tagCriteria.minItemCombination,
              item_min_qty: this._criteria[0].tagCriteria.itemMinQty,
              item_min_qty_uom_type:
                this._criteria[0].tagCriteria.itemMinUomType,
              item_has_matching_tag:
                this._criteria[0].tagCriteria.isItemHasMatchingTag,
              is_ratio_based: this._criteria[0].tagCriteria.isRatioBased,
              items: this._criteria[0].tagCriteria.items.map((item) => {
                const itemQty = this.cartItem.cartQty.byItem(item.id);
                return {
                  id: item.id,
                  qty: itemQty.qty.value,
                  qty_intermediate: itemQty.qtyIntermediate.value,
                  qty_pack: itemQty.qtyPack.value,
                };
              }),
              included_tag:
                this._criteria[0].tagCriteria.includedTag?.toString() || null,
              included_tag_min_qty:
                this._criteria[0].tagCriteria.includedTagMinQty,
              included_tag_min_qty_uom_type:
                this._criteria[0].tagCriteria.includedTagMinUomType,
              included_tag_qty: includedTagSummary?.qty.value || 0,
              included_tag_qty_previous:
                this.getPreviousQty(includedTagSummary),
            }
          : null,
      type: this.props.key.type,
      criteria: this._criteria.map((value) => ({
        applied: value.applied,
        priorities: value.priorities,
        min_qty: value.minQty,
        min_uom_type: value.minUomType,
        min_purchase: value.minPurchase,
        benefits: value.benefits.map((x) => ({
          type: x.type,
          value: x.value,
          uom_type: x.uomType,
        })),
        base_offer: Math.ceil(value.offer * this.item.baseQty),
        pack_offer: this.item.packQty
          ? Math.ceil(value.offer * this.item.packQty)
          : null,
        coin_amount: value.coinAmount,
      })),
    };
  }
}
