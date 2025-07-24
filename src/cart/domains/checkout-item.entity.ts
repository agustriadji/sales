import { Nullable } from '@wings-corporation/core';
import { Entity, EntityId, Money, Quantity } from '@wings-corporation/domain';
import {
  RecommendationType,
  UomType,
  UomTypeEnum,
} from '@wings-online/app.constants';
import { MathUtil, SalesUtil } from '@wings-online/common';
import { Uom } from '@wings-online/common/interfaces/item-uom.interface';

import { ItemTagPurchase } from '../interfaces/promotion.interface';
import { CheckoutSummary } from './checkout.aggregate';
import { FlashSale } from './flash-sale.vo';
import { ItemVoucher } from './item-voucher.entity';
import { PackQty } from './pack-qty.vo';
import { PromoBenefit } from './promo-benefit.vo';
import {
  ItemTagPurchaseBetweenCriterion,
  MinimumItemTagPurchaseCriterion,
} from './promo-criteria.vo';
import { RegularPromo } from './regular-promo.vo';
import { SalesFactor } from './sales-factor.vo';
import { Tag } from './tag.vo';
import { TPRPromo } from './tpr-promo.vo';

type CheckoutSimulatedPrice = {
  subtotal: Money;
  flashSaleDiscount: Money;
  regularDiscount: Money;
  lifetimeDiscount: Money;
};

type CheckoutItemProps = {
  itemId: EntityId<string>;
  itemName: string;
  externalId: EntityId<string>;
  qty: Quantity;
  salesFactor: SalesFactor;
  description: Nullable<string>;
  baseUom: Uom;
  packUom: Nullable<Uom>;
  tags: Tag[];
  recommendationType: Nullable<RecommendationType>;
  price?: Money;
  flashSale?: FlashSale;
  lifetimePromotion?: TPRPromo;
  isBaseSellable: boolean;
  isPackSellable: boolean;
  addedAt: Date;
  simulatedPrice?: CheckoutSimulatedPrice;
};

type CreateCheckoutItemProps = Omit<CheckoutItemProps, 'flashSale'>;

type Promotion = RegularPromo | TPRPromo;

export class CheckoutItem extends Entity<CheckoutItemProps, string> {
  private _checkoutSummary: CheckoutSummary = {
    items: {},
    tags: {},
  };
  private promotions: Promotion[] = [];
  private voucher: ItemVoucher;
  // private voucherMaxDiscount: Money | undefined;
  private constructor(props: CheckoutItemProps, id?: string) {
    super(props, id ? EntityId.fromString(id) : undefined);
  }

  public static create(props: CreateCheckoutItemProps, id?: string) {
    return new CheckoutItem({ ...props }, id);
  }

  get flashSaleExternalId(): Nullable<string> {
    return this._props.flashSale?.externalId || null;
  }

  get itemId(): EntityId<string> {
    return this._props.itemId;
  }

  get externalId(): EntityId<string> {
    return this._props.externalId;
  }

  get itemName(): string {
    return this._props.itemName;
  }

  get description(): Nullable<string> {
    return this._props.description;
  }

  get baseUom(): Uom {
    return this._props.baseUom;
  }

  get packUom(): Nullable<Uom> {
    return this._props.packUom;
  }

  get qty(): Quantity {
    return this._props.qty;
  }

  get qtyIntermediate(): Quantity {
    return this.baseUom.packQty.value > 1
      ? Quantity.create(Math.floor(this.qty.value / this.baseUom.packQty.value))
      : Quantity.zero();
  }

  get qtyPack(): Quantity {
    return this.packUom && this.packUom.packQty.value > 1
      ? Quantity.create(Math.floor(this.qty.value / this.packUom.packQty.value))
      : Quantity.zero();
  }

  get price(): Money | undefined {
    if (this.simulatedPrice) {
      return Money.create(this.simulatedPrice.subtotal.value / this.qty.value);
    }
    return this._props.price;
  }

  get tags(): Tag[] {
    return this._props.tags;
  }

  get salesFactor(): SalesFactor {
    return this._props.salesFactor;
  }

  get isBaseSellable(): boolean {
    return this._props.isBaseSellable;
  }

  get isPackSellable(): boolean {
    return this._props.isPackSellable;
  }

  get baseQty(): PackQty {
    return this._props.baseUom.packQty;
  }

  get packQty(): PackQty {
    return this._props.packUom
      ? PackQty.create(
          this._props.packUom.packQty.value / this._props.baseUom.packQty.value,
        )
      : this._props.baseUom.packQty;
  }

  get factorValue(): number {
    return !this.isBaseSellable &&
      this.salesFactor.value % this.packQty.value > 0
      ? this.packQty.value
      : this.salesFactor.value;
  }

  get recommendationType(): Nullable<RecommendationType> {
    return this._props.recommendationType;
  }

  get promotionQty(): Quantity {
    return this.qty.subtract(this.flashSaleQty);
  }

  get flashSaleQty(): Quantity {
    if (!this._props.flashSale) return Quantity.zero();

    const tag = this._props.flashSale.tag
      ? this._checkoutSummary.tags[this._props.flashSale.tag.toString()]
      : undefined;

    const remainingQty = tag
      ? this.getRemainingTagQuota(this._props.flashSale.maxQty, tag.items, [])
      : this._props.flashSale.maxQty;

    if (
      this._props.flashSale.minQty &&
      this._props.flashSale.minQty.gt(tag ? tag.qty : this.qty)
    ) {
      return Quantity.zero();
    }

    if (this.qty.gte(remainingQty)) return remainingQty;

    return this.qty;
  }

  get flashSaleDiscount(): Money {
    const initialPrice = this.priceAfterLifetimePromotion;
    if (!initialPrice) return Money.zero();
    if (!this._props.flashSale) return Money.zero();
    if (this.flashSaleQty.equals(Quantity.zero())) return Money.zero();
    if (this.simulatedPrice) {
      return Money.create(
        this.simulatedPrice.flashSaleDiscount.value / this.flashSaleQty.value,
      ).add(this.lifetimePromotionDiscount);
    }

    let tagPurchase: ItemTagPurchase | undefined;
    if (this._props.flashSale?.tag) {
      const tag =
        this.checkoutSummary.tags[this._props.flashSale.tag.toString()];
      tagPurchase = tag
        ? {
            ...tag,
            tag: this._props.flashSale.tag,
          }
        : undefined;
    }
    const benefit = this._props.flashSale.benefitOf(
      {
        itemId: this.itemId,
        qty: this.qty,
        qtyIntermediate: this.qtyIntermediate,
        qtyPack: this.qtyPack,
        subtotal: Money.zero(), // flash sale dont have minimum purchase
        addedAt: this.props.addedAt,
      },
      tagPurchase,
    );

    const flashsaleDiscount = benefit
      ? this.calculateDiscount(benefit, initialPrice)
      : Money.zero();
    return flashsaleDiscount.add(this.lifetimePromotionDiscount);
  }

  get lifetimePromotionDiscount(): Money {
    if (this.simulatedPrice) {
      return Money.create(
        this.simulatedPrice.lifetimeDiscount.value / this.qty.value,
      );
    }

    const benefit = this._props.lifetimePromotion?.benefit(
      this._checkoutSummary,
    );

    if (!benefit?.discount || !this.price) return Money.zero();

    return this.calculateDiscount(benefit, this.price);
  }

  get priceAfterLifetimePromotion(): Money {
    return this.price
      ? this.price.subtract(this.lifetimePromotionDiscount)
      : Money.zero();
  }

  get totalFlashSaleDiscount(): Money {
    return this.flashSaleDiscount.multiply(this.flashSaleQty);
  }

  get flashSaleCoin(): Money {
    const initialPrice = this.priceAfterLifetimePromotion;
    if (!initialPrice) return Money.zero();
    if (!this._props.flashSale) return Money.zero();
    if (this.flashSaleQty.equals(Quantity.zero())) return Money.zero();
    let tagPurchase: ItemTagPurchase | undefined;
    if (this._props.flashSale?.tag) {
      tagPurchase = {
        ...this.checkoutSummary.tags[this._props.flashSale.tag.toString()],
        tag: this._props.flashSale.tag,
      };
    }
    const benefit = this._props.flashSale.benefitOf(
      {
        itemId: this.itemId,
        qty: this.qty,
        qtyIntermediate: this.qtyIntermediate,
        qtyPack: this.qtyPack,
        subtotal: Money.zero(), // flash sale dont have minimum purchase
        addedAt: this.props.addedAt,
      },
      tagPurchase,
    );

    return benefit ? this.calculateCoin(benefit, initialPrice) : Money.zero();
  }

  get checkoutSummary(): CheckoutSummary {
    return this._checkoutSummary;
  }

  get promotionDiscount(): Money {
    return this.promotionQty.value > 0
      ? Money.create(
          this.totalPromotionDiscount.value / this.promotionQty.value,
        )
      : Money.zero();
  }

  get totalPromotionDiscount(): Money {
    const initialPrice = this.priceAfterLifetimePromotion;
    if (!initialPrice) return Money.zero();
    if (this.simulatedPrice)
      return this.simulatedPrice.regularDiscount.add(
        this.lifetimePromotionDiscount.multiply(this.promotionQty),
      );

    let totalDiscount = Money.zero();
    let prices = [
      {
        price: initialPrice,
        qty: this.promotionQty,
      },
    ];

    for (const promotion of this.sortedPromotions) {
      let benefit: PromoBenefit | undefined;
      if (promotion instanceof TPRPromo) {
        benefit = promotion.benefit(this._checkoutSummary);
      } else {
        benefit = promotion.benefit;
      }
      if (!benefit?.discount) continue;

      let maxInBaseQty: Quantity | undefined;
      if (benefit.maxQty) {
        maxInBaseQty = this.getMaxQtyInBase(benefit.maxQty, benefit.maxUomType);
      }

      let qty =
        maxInBaseQty && this.promotionQty.gt(maxInBaseQty)
          ? maxInBaseQty
          : this.promotionQty;

      if (promotion instanceof TPRPromo) {
        const tagCriteria = promotion.tagCriteria;

        if (tagCriteria?.isRatioBased) {
          const criterion = promotion.condition.criteria[0].criterion as
            | MinimumItemTagPurchaseCriterion
            | ItemTagPurchaseBetweenCriterion;

          const tag = this._checkoutSummary.tags[criterion.tag.toString()];

          const mustIncludeTag = tagCriteria.includedTag
            ? this._checkoutSummary.tags[tagCriteria.includedTag.toString()]
            : undefined;

          let mustIncludeItemTotalQty = Quantity.zero();
          if (tagCriteria?.items.length) {
            mustIncludeItemTotalQty = tagCriteria.items.reduce((acc, item) => {
              const itemCartQty = this._checkoutSummary.items[item.id];
              return acc.add(
                SalesUtil.getQtyByUomType(
                  itemCartQty,
                  tagCriteria.itemMinUomType,
                ),
              );
            }, Quantity.zero());
          } else if (tagCriteria?.includedTag && mustIncludeTag) {
            mustIncludeItemTotalQty = SalesUtil.getQtyByUomType(
              mustIncludeTag,
              tagCriteria.includedTagMinUomType,
            );
          }

          let tagQty = tag?.qty || Quantity.zero();

          if (tagCriteria.isItemHasMatchingTag) {
            // exclude the must include items from the tag qty
            tagQty = tag.qty.subtract(
              tagCriteria.items.reduce((acc, item) => {
                return acc.add(
                  this._checkoutSummary.items[item.id]?.qty || Quantity.zero(),
                );
              }, Quantity.zero()),
            );
            tagQty = tagQty.subtract(mustIncludeTag?.qty || Quantity.zero());
          }

          const { x: nonMustIncludeItemQuota, y: mustIncludeItemQuota } =
            MathUtil.maxScale(tagQty.value, mustIncludeItemTotalQty.value, {
              x: criterion.minQty.value,
              y: tagCriteria.itemMinQty || tagCriteria.includedTagMinQty,
            });

          const mustIncludeItemMinUomType = tagCriteria.itemMinQty
            ? tagCriteria.itemMinUomType
            : tagCriteria.includedTagMinUomType;

          const mustIncludeItemQuotaInBase =
            mustIncludeItemQuota *
            (mustIncludeItemMinUomType === UomTypeEnum.PACK
              ? this.packUom?.packQty.value || 1
              : mustIncludeItemMinUomType === UomTypeEnum.INTERMEDIATE
              ? this.baseUom.packQty.value
              : 1);

          if (tagCriteria.items.some((i) => i.id === this.itemId.value)) {
            qty = Quantity.create(
              Math.min(qty.value, mustIncludeItemQuotaInBase),
            );
          } else {
            let remainingQuota: Quantity;

            const isMustIncludeTagItem =
              tagCriteria.includedTag &&
              this.tags.some((t) => t.equals(tagCriteria.includedTag));

            if (isMustIncludeTagItem) {
              remainingQuota = this.getRemainingTagQuota(
                Quantity.create(mustIncludeItemQuotaInBase),
                mustIncludeTag!.items,
                [],
              );
            } else {
              remainingQuota = this.getRemainingTagQuota(
                Quantity.create(nonMustIncludeItemQuota),
                tag.items,
                tagCriteria.items
                  .map((i) => EntityId.fromString(i.id))
                  .concat(mustIncludeTag?.items.map((i) => i.itemId) || []),
              );
            }

            qty = Quantity.create(Math.min(qty.value, remainingQuota.value));
          }
        }
      }

      let remainingQty = qty;
      const newPrices: Array<{ price: Money; qty: Quantity }> = [];
      for (let i = 0; i < prices.length; i++) {
        if (remainingQty.equals(Quantity.zero())) {
          newPrices.push(prices[i]);
          continue;
        }

        const price = prices[i];
        const discount = this.calculateDiscount(benefit, price.price);
        const discountQty = remainingQty.lt(price.qty)
          ? remainingQty
          : price.qty;

        totalDiscount = totalDiscount.add(discount.multiply(discountQty));

        if (totalDiscount.gt(this.subtotal)) {
          return this.subtotal;
        }

        if (discountQty.lt(price.qty)) {
          newPrices.push({
            price: discount.gt(price.price)
              ? Money.create(0)
              : price.price.subtract(discount),
            qty: discountQty,
          });
          newPrices.push({
            price: price.price,
            qty: price.qty.subtract(discountQty),
          });
        } else {
          newPrices.push({
            price: discount.gt(price.price)
              ? Money.create(0)
              : price.price.subtract(discount),
            qty: discountQty,
          });
        }

        remainingQty = remainingQty.subtract(discountQty);
      }

      prices = newPrices;
    }

    return totalDiscount.add(
      this.lifetimePromotionDiscount.multiply(this.promotionQty),
    );
  }

  get promotionCoin(): Money {
    return this.promotionQty.value > 0
      ? Money.create(this.totalPromotionCoin.value / this.promotionQty.value)
      : Money.zero();
  }

  get totalPromotionCoin(): Money {
    const initialPrice = this.priceAfterLifetimePromotion;

    if (!initialPrice) return Money.zero();

    let totalCoin = Money.zero();
    let prices = [
      {
        price: initialPrice,
        qty: this.promotionQty,
      },
    ];

    for (const promotion of this.sortedPromotions) {
      let benefit: PromoBenefit | undefined;
      if (promotion instanceof TPRPromo) {
        benefit = promotion.benefit(this._checkoutSummary);
      } else {
        benefit = promotion.benefit;
      }
      if (!benefit?.coin) continue;

      let maxInBaseQty: Quantity | undefined;
      if (benefit.maxQty) {
        maxInBaseQty = this.getMaxQtyInBase(benefit.maxQty, benefit.maxUomType);
      }

      const qty =
        maxInBaseQty && this.promotionQty.gt(maxInBaseQty)
          ? maxInBaseQty
          : this.promotionQty;

      let remainingQty = qty;
      const newPrices: Array<{ price: Money; qty: Quantity }> = [];
      for (let i = 0; i < prices.length; i++) {
        if (remainingQty.equals(Quantity.zero())) {
          newPrices.push(prices[i]);
          continue;
        }

        const price = prices[i];
        const discountQty = remainingQty.lt(price.qty)
          ? remainingQty
          : price.qty;

        const coin = this.calculateCoin(benefit, price.price);
        totalCoin = totalCoin.add(coin.multiply(discountQty));

        if (discountQty.lt(price.qty)) {
          newPrices.push({
            price: coin.gt(price.price)
              ? Money.create(0)
              : price.price.subtract(coin),
            qty: discountQty,
          });
          newPrices.push({
            price: price.price,
            qty: price.qty.subtract(discountQty),
          });
        } else {
          newPrices.push({
            price: coin.gt(price.price)
              ? Money.create(0)
              : price.price.subtract(coin),
            qty: discountQty,
          });
        }

        remainingQty = remainingQty.subtract(discountQty);
      }

      prices = newPrices;
    }

    return totalCoin;
  }

  get addedAt(): Date {
    return this._props.addedAt;
  }

  get subtotal(): Money {
    if (!this.price) return Money.zero();
    return this.price.multiply(this.qty);
  }

  get totalAmount(): Money {
    return this.subtotal
      .subtract(this.totalFlashSaleDiscount)
      .subtract(this.totalPromotionDiscount);
  }

  get totalRegular(): Money {
    const subtotal = this.price?.multiply(this.promotionQty) || Money.zero();
    return subtotal.subtract(this.totalPromotionDiscount);
  }

  get totalFlashSale(): Money {
    const subtotal = this.price?.multiply(this.flashSaleQty) || Money.zero();
    return subtotal.subtract(this.totalFlashSaleDiscount);
  }

  get appliedVoucher(): ItemVoucher | undefined {
    return this.voucher;
  }

  get sortedPromotions(): Promotion[] {
    return this.promotions.sort((a, b) => a.priority - b.priority);
  }

  get simulatedPrice(): CheckoutSimulatedPrice | undefined {
    return this.props.simulatedPrice;
  }

  get promoExternalId(): string | null {
    return (
      this.promotions.find((promo) => promo.externalId)?.externalId || null
    );
  }

  setCheckoutSummary(checkoutSummary: CheckoutSummary) {
    this._checkoutSummary = checkoutSummary;
  }

  applyFlashSale(flashSale: FlashSale) {
    this._props.flashSale = flashSale;
  }

  applyLifetimePromotion(promotion: TPRPromo) {
    this._props.lifetimePromotion = promotion;
  }

  addPromotion(promotion: Promotion) {
    const existingPromotionIndex = this.promotions.findIndex(
      (x) => x.priority === promotion.priority,
    );

    if (existingPromotionIndex === -1) {
      this.promotions.push(promotion);
    } else {
      // if promotion with the same priority already exists, replace it only if the new promotion's target has higher priority (lower value)
      if (
        this.promotions[existingPromotionIndex].targetPriority >
        promotion.targetPriority
      ) {
        this.promotions[existingPromotionIndex] = promotion;
      }
    }
  }

  applyVoucher(voucher: ItemVoucher): void {
    this.voucher = voucher;
  }

  private getMaxQtyInBase(
    qty: Quantity,
    uomType: UomType = UomTypeEnum.BASE,
  ): Quantity {
    if (uomType === UomTypeEnum.PACK && this.packUom) {
      return Quantity.create(qty.value * this.packUom.packQty.value);
    } else if (uomType === UomTypeEnum.INTERMEDIATE) {
      return Quantity.create(qty.value * this.baseUom.packQty.value);
    } else {
      return qty;
    }
  }

  private calculateDiscount(benefit: PromoBenefit, price: Money): Money {
    if (!benefit.discount) return Money.zero();

    if (benefit.discount.type === 'PERCENTAGE') {
      return benefit.discount.calculate(price);
    } else {
      const discount = benefit.discount.calculate(price) || Money.zero();
      if (benefit.scaleUomType === UomTypeEnum.PACK && this.packUom) {
        return Money.create(discount.value / this.packUom.packQty.value);
      } else if (benefit.scaleUomType === UomTypeEnum.INTERMEDIATE) {
        return Money.create(discount.value / this.baseUom.packQty.value);
      } else {
        return discount;
      }
    }
  }

  private calculateCoin(benefit: PromoBenefit, price: Money): Money {
    if (!benefit.coin) return Money.zero();

    if (benefit.coin.type === 'PERCENTAGE') {
      return benefit.coin.calculate(price);
    } else {
      const coin = benefit.coin.calculate(price) || Money.zero();
      if (benefit.scaleUomType === UomTypeEnum.PACK && this.packUom) {
        return Money.create(coin.value / this.packUom.packQty.value);
      } else if (benefit.scaleUomType === UomTypeEnum.INTERMEDIATE) {
        return Money.create(coin.value / this.baseUom.packQty.value);
      } else {
        return coin;
      }
    }
  }

  private getRemainingTagQuota(
    quotaInBaseUom: Quantity,
    tagItemsPurchase: {
      itemId: EntityId<string>;
      qty: Quantity;
      qtyIntermediate: Quantity;
      qtyPack: Quantity;
      addedAt: Date;
    }[],
    ignoredItemIds: EntityId<string>[],
  ): Quantity {
    let remainingQty = quotaInBaseUom;

    const sortedTagItems = tagItemsPurchase.sort(
      (a, b) => a.addedAt.getTime() - b.addedAt.getTime(),
    );

    for (const item of sortedTagItems) {
      if (item.itemId.equals(this.itemId)) {
        break;
      }

      if (ignoredItemIds.some((i) => i.equals(item.itemId))) {
        continue;
      }

      if (remainingQty.gt(item.qty)) {
        remainingQty = remainingQty.subtract(item.qty);
      } else {
        remainingQty = Quantity.zero();
        break;
      }
    }

    return remainingQty;
  }
}
