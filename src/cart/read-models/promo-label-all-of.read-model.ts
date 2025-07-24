import {
  Benefit,
  CartItemReadModel,
  JsonPKWOLabelProps,
  JsonTPRDirectLabelProps,
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
  MinimumPurchaseQtyByTagCriterion,
  ProductBenefit,
  PromoUtil,
  ReadModel,
  TagCriteria,
} from '@wings-online/common';

import { SalesItemUomReadModel, Tag } from '../domains';
import {
  ItemPromo,
  PromoConditionAllOf,
  RegularPromo,
  TprDirectPromo,
} from '../promotion';
import { TagCartQuantity } from './cart-qty.read-model';
import { ItemReadModel } from './item.read-model';
import { RegularCartItemReadModel } from './regular-cart-item.read-model';

type Criteria = {
  minQty: number;
  minQtyUomType: UomType;
  tagCriteria?: TagCriteria;
};

type Promo = RegularPromo | TprDirectPromo;
type PromoLabelAllOfKey = PromoLabelKey & {
  type: 'PKWO' | 'TPR_DIRECT';
  benefitQty?: number;
  maxQty?: number;
  maxUomType?: UomType;
  scaleQty: Nullable<number>;
  scaleUomType: Nullable<UomType>;
  criteria: Criteria;
};
interface PromoLabelAllOfReadModelProps extends PromoLabelReadModelProps {
  key: PromoLabelAllOfKey;
  code: string;
  offer: number;
  priorities: number[];
  benefits: Array<Benefit>;
  freeProduct?: SalesItemUomReadModel;
  coinAmount: number;
  coinOffer: number;
}

export class PromoLabelAllOfReadModel extends ReadModel {
  constructor(readonly props: PromoLabelAllOfReadModelProps) {
    super();
  }

  static fromItemPromotion(props: {
    item: CartItemReadModel;
    price: Money;
    coinPrice: Money;
    promo: Promo;
    applied: boolean;
  }): PromoLabelAllOfReadModel | undefined {
    const { item, price, coinPrice, promo, applied } = props;
    // Early return if no discount value for non-product benefits
    if (
      !promo.condition.benefit.product &&
      !promo.condition.benefit.discount?.value.value
    ) {
      return undefined;
    }

    const isRegularPromo = promo.type === 'REG';
    const isFreeProduct = Boolean(promo.condition.benefit.product);

    // Extract tag from promotion condition if applicable
    const promoTagCriterion =
      promo.condition.criteria[0]?.criterion instanceof
      MinimumPurchaseQtyByTagCriterion
        ? promo.condition.criteria[0].criterion
        : undefined;

    const benefitUomType = isFreeProduct
      ? promo.condition.benefit.product!.freeItemUomType
      : undefined;

    // Create label
    const label = new PromoLabelAllOfReadModel({
      id: promo.id,
      code: promo.code,
      applied,
      key: {
        id: isRegularPromo ? undefined : promo.condition.id,
        item,
        itemPrice: price.value,
        coinPrice: coinPrice.value,
        type: isRegularPromo ? 'PKWO' : 'TPR_DIRECT',
        tag: promo.tag?.toString(),
        maxQty: isRegularPromo
          ? undefined
          : promo.condition.benefit.maxQty?.value,
        maxUomType: isRegularPromo
          ? undefined
          : promo.condition.benefit.maxUomType,
        benefitQty: promo.condition.benefit.product
          ? promo.condition.benefit.product?.freeItemQty
          : undefined,
        benefitUomType,
        scaleQty: isRegularPromo ? 1 : promo.condition.scaleQty?.value || 1,
        scaleUomType: isRegularPromo
          ? UomTypeEnum.BASE
          : promo.condition.scaleUomType,
        criteria: {
          minQty: promo.condition.criteria[0]?.criterion.qty.value || 1,
          minQtyUomType:
            promo.condition.criteria[0]?.criterion.uomType || UomTypeEnum.BASE,
          tagCriteria: promoTagCriterion?.tagCriteria,
        },
      },
      priorities: [promo.priority],
      benefits: [],
      offer: price.value,
      freeProduct: isFreeProduct
        ? promo.condition.benefit.product?.freeItem
        : undefined,
      coinAmount: 0,
      coinOffer: price.value,
    });

    // Apply discount if present
    if (promo.condition.benefit.discount?.value.value) {
      label.mergeBenefit(promo.condition.benefit.discount);
    }

    if (promo.condition.benefit.coin?.value.value) {
      label.calculateCoinBenefit(promo.condition.benefit.coin);
    }

    return label;
  }

  get id(): EntityId<string> {
    return this.props.id;
  }

  get key(): PromoLabelAllOfKey {
    return this.props.key;
  }

  get isEmpty(): boolean {
    return this.props.benefits.length === 0;
  }

  get offer(): Money {
    return Money.create(this.props.offer);
  }

  get applied(): boolean {
    return this.props.applied;
  }

  get benefits(): Benefit[] {
    return this.props.benefits;
  }

  get freeProduct(): SalesItemUomReadModel | undefined {
    return this.props.freeProduct;
  }
  get minQty(): number {
    return 1;
  }

  get item(): ItemReadModel {
    return this.props.key.item.item;
  }

  get cartItem(): CartItemReadModel {
    return this.props.key.item;
  }

  get hasTagCriteria(): boolean {
    return !!this.criteria?.tagCriteria;
  }

  setApplied(): void {
    this.props.applied = true;
  }

  setUnapplied(): void {
    this.props.applied = false;
  }

  private isMatch(promotion: ItemPromo): boolean {
    if (promotion.condition.type !== 'AllOf') return false;

    if (promotion.tagCriteria) return false;

    if (promotion.condition.benefit.product) return false;

    const discount = promotion.condition.benefit.discount;
    if (discount?.scaleUomType) {
      // Ensure that the label does not include benefits with mismatched uom
      if (
        this.props.benefits.some(
          (x) => x.uomType && x.uomType !== discount.scaleUomType,
        )
      ) {
        return false;
      }
    }

    if (promotion.type === 'REG' && this.key.type === 'PKWO') {
      return true;
    }

    if (promotion.type === 'TPR' && this.key.type === 'TPR_DIRECT') {
      return (
        this.key.maxUomType === promotion.condition.benefit.maxUomType &&
        this.key.maxQty === promotion.condition.benefit.maxQty?.value
      );
    }

    return false;
  }

  addPromotion(promotion: ItemPromo, applied: boolean): boolean {
    if (this.isMatch(promotion)) {
      this.props.priorities.push(promotion.priority);
      this.mergeBenefit(
        (promotion.condition as PromoConditionAllOf).benefit.discount!,
      );

      if (this.applied && !applied) {
        this.setUnapplied();
      }
      return true;
    }
    return false;
  }

  calculateFreeProduct(
    item: RegularCartItemReadModel,
    product: ProductBenefit,
  ): void {
    if (!this.props.freeProduct) return;

    const benefitQty = this.key.tag
      ? this.calculateTaggedFreeProduct(item, product)
      : this.calculateUntaggedFreeProduct(item, product);

    if (benefitQty <= 0) this.setUnapplied();
    else this.setApplied();

    this.benefits.push({
      type: 'FREE_PRODUCT',
      value: benefitQty,
    });
  }

  private calculateTaggedFreeProduct(
    item: RegularCartItemReadModel,
    product: ProductBenefit,
  ): number {
    if (!this.key.tag) return 0;

    const tagSummary = this.cartItem.cartQty.byTag(
      Tag.fromString(this.key.tag),
    );

    if (!tagSummary.qty.gt(Quantity.zero())) return 0;

    const benefitScale = this.calculateBenefitScale(tagSummary, item);

    return this.calculateBenefitQuantity(benefitScale, product);
  }

  private calculateUntaggedFreeProduct(
    item: RegularCartItemReadModel,
    product: ProductBenefit,
  ): number {
    if (!item.qty.gt(Quantity.zero())) return 0;

    const scaledFreeQty = this.calculateScaledFreeQuantity();
    const totalItemQty = this.totalQty(item);
    const eligibleQty = Math.floor(totalItemQty / scaledFreeQty);

    return this.calculateBenefitQuantity(eligibleQty, product);
  }

  private calculateBenefitScale(
    tagSummary: TagCartQuantity,
    item: RegularCartItemReadModel,
  ): number {
    const { scaleUomType, scaleQty } = this.key;

    let intermediateQty = tagSummary.qty.value;
    if (item.parent.item.hasIntermediateUoM()) {
      intermediateQty = Math.floor(
        tagSummary.qty.value / item.parent.item.baseQty,
      );
    }

    let packQty = tagSummary.qty.value;
    if (item.parent.item.hasPackUoM()) {
      packQty = Math.floor(tagSummary.qty.value / item.parent.item.packQty);
    }

    const scaleMap = {
      BASE: tagSummary.qty.value,
      INTERMEDIATE: intermediateQty,
      PACK: packQty,
    };

    return Math.floor(scaleMap[scaleUomType || 'BASE'] / (scaleQty || 1));
  }

  private calculateScaledFreeQuantity(): number {
    const { scaleUomType, scaleQty = 1 } = this.key;

    const scaleMap = {
      BASE: 1,
      INTERMEDIATE: this.item.hasIntermediateUoM() ? this.item.baseQty : 0,
      PACK: this.item.hasPackUoM() ? this.item.packQty : 0,
    };

    return scaleMap[scaleUomType || 'BASE'] * (scaleQty || 1);
  }

  private totalQty(item: RegularCartItemReadModel): number {
    return (
      item.totalBaseQty() * this.item.baseQty +
      item.totalPackQty() * this.item.packQty
    );
  }

  private calculateBenefitQuantity(
    scale: number,
    product: ProductBenefit,
  ): number {
    const { benefitUomType, benefitQty } = this.key;

    if (!benefitUomType || !benefitQty) {
      return 0;
    }

    let calculatedBenefitQty = 0;

    switch (benefitUomType) {
      case 'BASE':
        calculatedBenefitQty = scale * benefitQty;
        break;
      case 'INTERMEDIATE':
        if (!product.freeItem.intermediate) return 0;
        calculatedBenefitQty =
          scale * product.freeItem.intermediate.contains.value * benefitQty;
        break;
      case 'PACK':
        if (!product.freeItem.pack) return 0;
        calculatedBenefitQty =
          scale * product.freeItem.pack.contains.value * benefitQty;
        break;
    }

    if (this.key.maxQty && this.key.maxUomType) {
      return this.applyMaxQuantityLimit(calculatedBenefitQty, product);
    }

    return calculatedBenefitQty;
  }

  private applyMaxQuantityLimit(
    benefitQty: number,
    product: ProductBenefit,
  ): number {
    const { maxQty = 1, maxUomType } = this.key;
    if (!maxQty) return benefitQty;

    let limitedQty = benefitQty;

    switch (maxUomType) {
      case 'BASE':
        limitedQty = Math.min(benefitQty, maxQty);
        break;
      case 'INTERMEDIATE':
        if (!product.freeItem.intermediate) return 0;
        limitedQty = Math.min(
          benefitQty,
          maxQty * product.freeItem.intermediate.contains.value,
        );
        break;
      case 'PACK':
        if (!product.freeItem.pack) return 0;
        limitedQty = Math.min(
          benefitQty,
          maxQty * product.freeItem.pack.contains.value,
        );
        break;
    }

    return limitedQty;
  }

  private mergeBenefit(benefit: DiscountBenefit): void {
    this.props.offer = this.updateOffer(benefit).value;
    this.props.benefits.push({
      type: benefit.type,
      value: benefit.value.value,
      uomType: benefit.scaleUomType,
    });
  }

  private updateOffer(discount: DiscountBenefit): Money {
    if (discount.type === 'PERCENTAGE') {
      return PromoUtil.resolveOfferedPrice(
        this.offer,
        PromoUtil.resolvePercentageBenefit(discount, this.offer),
      );
    } else {
      return PromoUtil.resolveOfferedPrice(
        this.offer,
        PromoUtil.resolveAmountBenefit(discount, {
          baseQty: Quantity.create(this.item.baseQty),
          packQty: Quantity.create(this.item.packQty),
        }),
      );
    }
  }

  private calculateCoinBenefit(benefit: CoinBenefit): void {
    const discountedPrice = Money.create(this.props.key.coinPrice);
    const coin =
      benefit.type === 'PERCENTAGE'
        ? PromoUtil.resolvePercentageBenefit(benefit, discountedPrice)
        : PromoUtil.resolveAmountBenefit(benefit, {
            baseQty: Quantity.create(this.item.baseQty),
            packQty: Quantity.create(this.item.packQty),
          });

    this.props.coinAmount = coin.value;
    this.props.coinOffer = PromoUtil.resolveOfferedPrice(
      discountedPrice,
      coin,
    ).value;
  }

  get maxQty(): Quantity | undefined {
    if (!this.props.key.maxQty) {
      return undefined;
    }

    return Quantity.create(
      this.props.key.maxUomType === 'PACK'
        ? this.props.key.maxQty * this.item.packQty
        : this.props.key.maxUomType === 'INTERMEDIATE'
        ? this.props.key.maxQty * this.item.baseQty
        : this.props.key.maxQty,
    );
  }

  get scaleQty(): Quantity | undefined {
    if (!this.props.key.scaleQty) {
      return undefined;
    }

    return Quantity.create(
      this.props.key.scaleUomType === 'PACK'
        ? this.props.key.scaleQty * this.item.packQty
        : this.props.key.scaleQty * this.item.baseQty,
    );
  }

  get baseOffer(): Money {
    const discountedQty = this.maxQty?.value
      ? Math.min(this.item.baseQty, this.maxQty.value)
      : this.item.baseQty;
    return Money.create(
      this.props.offer * discountedQty +
        this.key.itemPrice * (this.item.baseQty - discountedQty),
    );
  }

  get packOffer(): Money {
    const discountedQty = this.maxQty?.value
      ? Math.min(this.item.packQty, this.maxQty.value)
      : this.item.packQty;
    return Money.create(
      this.props.offer * discountedQty +
        this.key.itemPrice * (this.item.packQty - discountedQty),
    );
  }

  get criteria(): Criteria | undefined {
    return this.props.key.criteria;
  }

  private getPreviousQty(tag: Nullable<TagCartQuantity>): number {
    if (!tag) return 0;

    const itemDate = this.cartItem.addedAt;

    return sumBy(
      tag.items.filter((i) => i.addedAt < itemDate),
      (i) => i.qty.value,
    );
  }

  toJSON(): JsonTPRDirectLabelProps | JsonPKWOLabelProps {
    const tagSummary = this.key.tag
      ? this.cartItem.cartQty.byTag(Tag.fromString(this.key.tag))
      : null;

    const includedTagSummary = this.criteria?.tagCriteria?.includedTag
      ? this.cartItem.cartQty.byTag(this.criteria.tagCriteria.includedTag)
      : null;

    return {
      applied: this.props.applied,
      external_id: this.props.code,
      priorities: this.props.priorities,
      tag: this.key.tag || null,
      tag_qty: tagSummary
        ? {
            base: tagSummary.qty.value,
            item_combination: tagSummary.items.length,
            previous_qty: this.getPreviousQty(tagSummary),
          }
        : null,
      tag_criteria:
        this.criteria?.tagCriteria && tagSummary
          ? {
              min_qty: this.criteria.minQty,
              min_qty_uom_type: this.criteria.minQtyUomType,
              min_item_combination:
                this.criteria.tagCriteria.minItemCombination,
              item_min_qty: this.criteria.tagCriteria.itemMinQty,
              item_min_qty_uom_type: this.criteria.tagCriteria.itemMinUomType,
              item_has_matching_tag:
                this.criteria.tagCriteria.isItemHasMatchingTag,
              is_ratio_based: this.criteria.tagCriteria.isRatioBased,
              items: this.criteria.tagCriteria.items.map((x) => {
                const itemQty = this.cartItem.cartQty.byItem(x.id);
                return {
                  id: x.id,
                  qty: itemQty.qty.value,
                  qty_intermediate: itemQty.qtyIntermediate.value,
                  qty_pack: itemQty.qtyPack.value,
                };
              }),
              included_tag:
                this.criteria.tagCriteria.includedTag?.toString() || null,
              included_tag_min_qty: this.criteria.tagCriteria.includedTagMinQty,
              included_tag_min_qty_uom_type:
                this.criteria.tagCriteria.includedTagMinUomType,
              included_tag_qty: includedTagSummary?.qty.value || 0,
              included_tag_qty_previous:
                this.getPreviousQty(includedTagSummary),
            }
          : null,
      type: this.props.key.type,
      max_qty: this.key.maxQty || null,
      max_uom_type: this.key.maxUomType || null,
      base_offer: Math.ceil(this.baseOffer.value),
      pack_offer: Math.ceil(this.packOffer.value),
      benefits: this.props.benefits.map((x) => ({
        type: x.type,
        value: x.value,
        uom_type: x.uomType,
      })),
      benefit_qty: this.key.benefitQty || 1,
      benefit_uom_type: this.key.benefitUomType || null,
      scale_qty: this.key.scaleQty,
      scale_uom_type: this.key.scaleUomType,
      free_product: this.freeProduct ? this.freeProduct.toJSON() : null,
      coin_amount: this.props.coinAmount,
    };
  }
}
