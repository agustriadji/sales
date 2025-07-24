import { CartItemPrice } from '.';

import { Money, Quantity } from '@wings-corporation/domain';
import { UomTypeEnum } from '@wings-online/app.constants';
import {
  ItemPromo,
  ItemPromoCondition,
  PromoBenefit,
  RegularPromo,
  TprDirectPromo,
  TprPromo,
  TprStrataPromo,
} from '@wings-online/cart/promotion';
import {
  MathUtil,
  MinimumPurchaseAmountCriterion,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
  PromoUtil,
  ReadModel,
  SalesUtil,
} from '@wings-online/common';

import { CartUtils } from '../utils/cart.utils';
import { CartItemReadModel } from './cart-item.read-model';
import { TagCartQuantity } from './cart-qty.read-model';
import { PromoLabelAllOfReadModel } from './promo-label-all-of.read-model';
import { PromoLabelOneOfReadModel } from './promo-label-one-of.read-model';
import {
  JsonPromoLabelProps,
  PromoLabelReadModel,
} from './promo-label.read-model';

export type JsonRegularCartItemProps = {
  base_qty: number;
  pack_qty: number;
  total_qty: number;
  price: CartItemPrice;
  coin: number;
  total: number;
  promo_labels: JsonPromoLabelProps[];
};

export class RegularCartItemReadModel extends ReadModel {
  private _promotions: Array<RegularPromo | TprPromo> = [];

  constructor(public readonly parent: CartItemReadModel) {
    super();
  }

  get qty(): Quantity {
    return this.parent.qty.subtract(this.parent.flashSaleQty);
  }

  get discount(): Money {
    if (this.totalDiscount.value === 0) return Money.zero();
    return Money.create(this.totalDiscount.value / this.qty.value);
  }

  get priceBeforeDiscount(): Money {
    return this.parent.price.subtract(this.parent.lifetimePromo.discountAmount);
  }

  get totalDiscount(): Money {
    const initialPrice = this.priceBeforeDiscount;
    let prices = [
      {
        price: initialPrice,
        qty: this.qty,
      },
    ];
    let totalDiscount = Money.zero();

    const promos = this.sortedPromotions;

    for (const promo of promos) {
      const benefit = CartUtils.getBenefitFromCondition(
        promo.condition,
        this.parent,
      );

      if (!benefit?.discount) continue;

      let maxInBaseQty: number | undefined = undefined;
      if (promo.type === 'TPR' && benefit.maxQty) {
        maxInBaseQty =
          benefit.maxUomType === UomTypeEnum.PACK
            ? benefit.maxQty.value * this.parent.item.packQty
            : benefit.maxUomType === UomTypeEnum.INTERMEDIATE
            ? benefit.maxQty.value * this.parent.item.baseQty
            : benefit.maxQty.value;
      }

      let discountedQty =
        maxInBaseQty === undefined
          ? this.qty.value
          : this.qty.value > maxInBaseQty
          ? maxInBaseQty
          : this.qty.value;

      if (
        promo.type === 'TPR' &&
        promo.condition.criteria[0].criterion instanceof
          MinimumPurchaseQtyByTagCriterion
      ) {
        const criterion = promo.condition.criteria[0].criterion;
        const tagCriteria = criterion.tagCriteria;
        if (tagCriteria?.isRatioBased) {
          const tag = this.parent.cartQty.byTag(criterion.tag);
          const mustIncludeTag = tagCriteria.includedTag
            ? this.parent.cartQty.byTag(tagCriteria.includedTag)
            : undefined;

          let mustIncludeItemTotalQty = 0;
          if (tagCriteria?.items.length) {
            mustIncludeItemTotalQty = tagCriteria.items.reduce((acc, item) => {
              const itemCartQty = this.parent.cartQty.byItem(item.id);
              return (
                acc +
                (tagCriteria.itemMinUomType === UomTypeEnum.PACK
                  ? itemCartQty.qtyPack.value
                  : tagCriteria.itemMinUomType === UomTypeEnum.INTERMEDIATE
                  ? itemCartQty.qtyIntermediate.value
                  : itemCartQty.qty.value)
              );
            }, 0);
          } else if (tagCriteria?.includedTag) {
            mustIncludeItemTotalQty = mustIncludeTag
              ? tagCriteria.includedTagMinUomType === UomTypeEnum.PACK
                ? SalesUtil.getQtyInPack(
                    mustIncludeTag.qty,
                    Quantity.create(this.parent.item.packQty),
                  ).value
                : tagCriteria.includedTagMinUomType === UomTypeEnum.INTERMEDIATE
                ? SalesUtil.getQtyInIntermediate(
                    mustIncludeTag.qty,
                    Quantity.create(this.parent.item.baseQty),
                  ).value
                : mustIncludeTag.qty.value
              : 0;
          }

          let tagQty = tag
            ? criterion.uomType === UomTypeEnum.PACK
              ? SalesUtil.getQtyInPack(
                  tag.qty,
                  Quantity.create(this.parent.item.packQty),
                ).value
              : criterion.uomType === UomTypeEnum.INTERMEDIATE
              ? SalesUtil.getQtyInPack(
                  tag.qty,
                  Quantity.create(this.parent.item.baseQty),
                ).value
              : tag.qty.value
            : 0;

          if (tagCriteria.isItemHasMatchingTag) {
            const nonMustIncludeItemTotalQty = tag?.qty.value
              ? tag.qty.value -
                tagCriteria.items.reduce((acc, item) => {
                  return acc + this.parent.cartQty.byItem(item.id).qty.value;
                }, 0)
              : 0;

            // convert nonMustIncludeItemTotalQty to minUomType
            tagQty = Math.floor(
              nonMustIncludeItemTotalQty /
                (criterion.uomType === UomTypeEnum.PACK
                  ? this.parent.item.packQty
                  : criterion.uomType === UomTypeEnum.INTERMEDIATE
                  ? this.parent.item.baseQty
                  : 1),
            );
          }

          const { x: nonMustIncludeItemQuota, y: mustIncludeItemQuota } =
            MathUtil.maxScale(tagQty, mustIncludeItemTotalQty, {
              x: criterion.qty.value,
              y: tagCriteria.itemMinQty || tagCriteria.includedTagMinQty,
            });

          if (tagCriteria.items.some((i) => i.id === this.parent.item.id)) {
            discountedQty = Math.min(
              discountedQty,
              mustIncludeItemQuota *
                (tagCriteria.itemMinUomType === 'PACK'
                  ? this.parent.item.packQty
                  : tagCriteria.itemMinUomType === 'INTERMEDIATE'
                  ? this.parent.item.baseQty
                  : 1),
            );
          } else {
            let remainingQuota: Quantity;

            const isMustIncludeTagItem =
              tagCriteria.includedTag &&
              this.parent.item.tags.includes(
                tagCriteria.includedTag.toString(),
              );

            if (isMustIncludeTagItem) {
              const quota = Quantity.create(
                mustIncludeItemQuota *
                  (criterion.uomType === 'PACK'
                    ? this.parent.item.packQty
                    : criterion.uomType === 'INTERMEDIATE'
                    ? this.parent.item.baseQty
                    : 1),
              );
              const tagPurchase = this.parent.cartQty.byTag(
                tagCriteria.includedTag!,
              );

              remainingQuota = this.getRemainingTagQuota(
                quota,
                tagPurchase,
                [],
              );
            } else {
              const quota = Quantity.create(
                nonMustIncludeItemQuota *
                  (criterion.uomType === 'PACK'
                    ? this.parent.item.packQty
                    : criterion.uomType === 'INTERMEDIATE'
                    ? this.parent.item.baseQty
                    : 1),
              );
              const tagPurchase = tag;

              remainingQuota = this.getRemainingTagQuota(
                quota,
                tagPurchase,
                tagCriteria.items
                  .map((i) => i.id)
                  .concat(mustIncludeTag?.items.map((i) => i.itemId) || []),
              );
            }

            discountedQty = Math.min(discountedQty, remainingQuota.value);
          }
        }
      }

      if (!discountedQty) continue;

      if (benefit && benefit.discount) {
        let remainingQty = discountedQty;
        const newPrices: Array<{ price: Money; qty: Quantity }> = [];

        for (let i = 0; i < prices.length; i++) {
          if (remainingQty === 0) {
            newPrices.push(prices[i]);
            continue;
          }

          const price = prices[i];
          const discount = PromoUtil.resolveMonetaryBenefit(
            benefit.discount,
            price.price,
            {
              baseQty: Quantity.create(this.parent.item.baseQty),
              packQty: Quantity.create(this.parent.item.packQty),
            },
          );
          const qty = Math.min(remainingQty, price.qty.value);

          totalDiscount = totalDiscount.add(
            discount.multiply(Quantity.create(qty)),
          );

          if (totalDiscount.gt(this.subtotal)) {
            return initialPrice;
          }

          if (qty < price.qty.value) {
            newPrices.push({
              price: discount.gt(price.price)
                ? Money.create(0)
                : price.price.subtract(discount),
              qty: Quantity.create(qty),
            });
            newPrices.push({
              price: price.price,
              qty: Quantity.create(price.qty.value - qty),
            });
          } else {
            newPrices.push({
              price: discount.gt(price.price)
                ? Money.create(0)
                : price.price.subtract(discount),
              qty: Quantity.create(qty),
            });
          }

          remainingQty -= qty;
        }

        prices = newPrices;
      }
    }

    return totalDiscount.add(this.lifetimeTotalDiscount);
  }

  get regularPromotion(): RegularPromo | undefined {
    return this.promotions.find((promo) => promo.type === 'REG') as
      | RegularPromo
      | undefined;
  }

  private calculateMaxDiscountForQty(qty: Quantity): Money {
    let price = Money.create(this.priceBeforeDiscount.value);
    let tprDiscount = Money.zero();

    const promotions = this.sortedPromotions;

    for (const promo of promotions) {
      let discount = Money.zero();

      const benefit = this.getPromoConditionMaxDiscount(promo.condition);
      const discountBenefit = benefit?.discount;

      if (!benefit) continue;

      let maxInBaseQty: number | undefined = undefined;
      if (promo.type === 'TPR' && benefit.maxQty) {
        maxInBaseQty =
          benefit.maxUomType === UomTypeEnum.PACK
            ? benefit.maxQty.value * this.parent.item.packQty
            : benefit.maxUomType === UomTypeEnum.INTERMEDIATE
            ? benefit.maxQty.value * this.parent.item.baseQty
            : benefit.maxQty.value;
      }

      const discountedQty =
        maxInBaseQty === undefined
          ? qty
          : qty.value > maxInBaseQty
          ? Quantity.create(maxInBaseQty)
          : qty;

      if (discountBenefit) {
        discount = PromoUtil.resolveMonetaryBenefit(discountBenefit, price, {
          baseQty: Quantity.create(this.parent.item.baseQty),
          packQty: Quantity.create(this.parent.item.packQty),
        });

        if (discount.gt(price)) {
          return this.priceBeforeDiscount;
        } else {
          price = price.subtract(discount);
        }
      }
      tprDiscount = tprDiscount.add(discount.multiply(discountedQty));
    }

    const regularPromoDiscount =
      this.regularPromotion?.condition.benefit.discount;
    return tprDiscount
      .add(
        regularPromoDiscount
          ? PromoUtil.resolveMonetaryBenefit(regularPromoDiscount, price, {
              baseQty: Quantity.create(this.parent.item.baseQty),
              packQty: Quantity.create(this.parent.item.packQty),
            }).multiply(qty)
          : Money.zero(),
      )
      .add(this.parent.lifetimePromo.discountAmount.multiply(qty));
  }

  get lifetimeTotalDiscount() {
    return this.parent.lifetimePromo.discountAmount.multiply(this.qty);
  }

  get promotions() {
    return this._promotions.filter((promo) => {
      if (promo.condition.type === 'AllOf') {
        if (
          !promo.condition.benefit.product &&
          promo.condition.benefit.discount?.value.value === 0
        )
          return false;
      } else if (promo.condition.type === 'OneOf') {
        if (
          !promo.condition.criteria.length ||
          promo.condition.criteria.some(
            (c) => !c.benefit.product && c.benefit.discount?.value.value === 0,
          )
        )
          return false;
      }

      return true;
    });
  }

  get sortedPromotions(): Array<RegularPromo | TprPromo> {
    return this.promotions.sort((a, b) => a.priority - b.priority);
  }

  get subtotal(): Money {
    return Money.create(this.qty.value * this.parent.price.value);
  }

  get total(): Money {
    return this.subtotal.subtract(this.totalDiscount);
  }

  get totalCoin(): Money {
    const initialPrice = this.priceBeforeDiscount;
    let prices = [
      {
        price: initialPrice,
        qty: this.qty,
      },
    ];
    let totalCoin = Money.zero();

    const promos = this.sortedPromotions;

    for (const promo of promos) {
      const benefit = CartUtils.getBenefitFromCondition(
        promo.condition,
        this.parent,
      );
      if (!benefit?.coin) continue;

      let maxInBaseQty: number | undefined = undefined;
      if (promo.type === 'TPR' && benefit.maxQty) {
        maxInBaseQty =
          benefit.maxUomType === UomTypeEnum.PACK
            ? benefit.maxQty.value * this.parent.item.packQty
            : benefit.maxUomType === UomTypeEnum.INTERMEDIATE
            ? benefit.maxQty.value * this.parent.item.baseQty
            : benefit.maxQty.value;
      }

      const discountedQty =
        maxInBaseQty === undefined
          ? this.qty.value
          : this.qty.value > maxInBaseQty
          ? maxInBaseQty
          : this.qty.value;

      let remainingQty = discountedQty;
      const newPrices: Array<{ price: Money; qty: Quantity }> = [];

      for (let i = 0; i < prices.length; i++) {
        if (remainingQty === 0) {
          newPrices.push(prices[i]);
          continue;
        }

        const price = prices[i];
        const qty = Math.min(remainingQty, price.qty.value);
        const coin = PromoUtil.resolveMonetaryBenefit(
          benefit.coin,
          price.price,
          {
            baseQty: Quantity.create(this.parent.item.baseQty),
            packQty: Quantity.create(this.parent.item.packQty),
          },
        );

        totalCoin = totalCoin.add(coin.multiply(Quantity.create(qty)));

        if (qty < price.qty.value) {
          newPrices.push({
            price: coin.gt(price.price)
              ? Money.create(0)
              : price.price.subtract(coin),
            qty: Quantity.create(qty),
          });
          newPrices.push({
            price: price.price,
            qty: Quantity.create(price.qty.value - qty),
          });
        } else {
          newPrices.push({
            price: coin.gt(price.price)
              ? Money.create(0)
              : price.price.subtract(coin),
            qty: Quantity.create(qty),
          });
        }

        remainingQty -= qty;
      }

      if (newPrices.length > 0) {
        prices = newPrices;
      }
    }

    return totalCoin;
  }

  private getPromoConditionMaxDiscount(
    condition: ItemPromoCondition,
  ): PromoBenefit | undefined {
    if (condition.type === 'AllOf') {
      return condition.benefit;
    } else {
      return (
        condition.criteria.length
          ? condition.criteria.reduce((acc, criteria) => {
              const discount = criteria.benefit.discount?.value.value || 0;
              return (acc.benefit.discount?.value.value || 0) < discount
                ? criteria
                : acc;
            })
          : undefined
      )?.benefit;
    }
  }

  addPromotion(promo: RegularPromo | TprPromo): void {
    // ensure that any uom type used in the promo data matches the uom type exist in the item
    if (!this.isPromoUomMatch(promo)) return;

    // only one TPR promotion with the same priority can be applied. Choose the one with the lowest target priority value.
    if (promo.type === 'TPR') {
      const existingPromoIndex = this._promotions.findIndex(
        (x) => x.type === 'TPR' && x.priority === promo.priority,
      );

      if (existingPromoIndex !== -1) {
        const existingPromoWithSamePriority = this._promotions[
          existingPromoIndex
        ] as TprPromo;

        if (
          promo.condition.priority <
          existingPromoWithSamePriority.condition.priority
        ) {
          this._promotions[existingPromoIndex] = promo;
          return;
        }

        return;
      }
    } else {
      if (this.regularPromotion) {
        return;
      }
    }

    // add to collection
    this._promotions.push(promo);
  }

  private isHighestCriteriaMet(promo: ItemPromo): boolean {
    if (promo.condition.type === 'AllOf') {
      return promo.condition.criteria.every((criteria) =>
        CartUtils.checkAgainstCriteria(criteria, this.parent),
      );
    } else {
      const highestCriteria = promo.condition.criteria.find(
        (criteria) =>
          criteria.criterion instanceof MinimumPurchaseQtyCriterion ||
          criteria.criterion instanceof MinimumPurchaseAmountCriterion ||
          criteria.criterion instanceof MinimumPurchaseQtyByTagCriterion,
      );
      return highestCriteria
        ? CartUtils.checkAgainstCriteria(highestCriteria, this.parent)
        : false;
    }
  }

  get labels(): PromoLabelReadModel[] {
    const labels = new Array<PromoLabelReadModel>();
    let coinPrice = this.priceBeforeDiscount;
    (this.sortedPromotions as ItemPromo[]).map((promo) => {
      const applied =
        this.qty.gt(Quantity.zero()) && this.isHighestCriteriaMet(promo);

      const isMatch = labels.some((label) => {
        return label.addPromotion(promo, applied);
      });
      if (!isMatch) {
        let newLabel: PromoLabelReadModel | undefined;
        if (promo.condition.type === 'OneOf') {
          newLabel = PromoLabelOneOfReadModel.fromItemPromotion({
            item: this.parent,
            price: this.priceBeforeDiscount,
            coinPrice,
            promo: promo as TprStrataPromo,
            applied,
          });

          if (newLabel) {
            // use strata highest amount to subtract coin price
            coinPrice = coinPrice.subtract(
              newLabel.highestCondition
                ? Money.create(newLabel.highestCondition.coinAmount)
                : Money.zero(),
            );
          }
        } else {
          newLabel = PromoLabelAllOfReadModel.fromItemPromotion({
            item: this.parent,
            price: this.priceBeforeDiscount,
            coinPrice,
            promo: promo as RegularPromo | TprDirectPromo,
            applied,
          });

          if (newLabel && newLabel.props.coinAmount) {
            coinPrice = coinPrice.subtract(
              Money.create(newLabel.props.coinAmount),
            );
          }

          if (promo.condition.benefit.product && newLabel) {
            newLabel.calculateFreeProduct(
              this,
              promo.condition.benefit.product,
            );
          }
        }
        newLabel && labels.push(newLabel);
      }
    });
    return labels;
  }

  private isPromoUomMatch(promo: RegularPromo | TprPromo): boolean {
    if (promo.type === 'REG') {
      return true;
    } else {
      if (promo.condition.type === 'AllOf') {
        if (
          (promo.condition.scaleUomType === UomTypeEnum.INTERMEDIATE ||
            (!promo.condition.benefit.product &&
              promo.condition.criteria[0].criterion.uomType ===
                UomTypeEnum.INTERMEDIATE) ||
            (!promo.condition.benefit.product &&
              promo.condition.benefit.maxUomType ===
                UomTypeEnum.INTERMEDIATE)) &&
          !this.parent.item.hasIntermediateUoM()
        ) {
          return false;
        }

        if (
          (promo.condition.scaleUomType === UomTypeEnum.PACK ||
            (!promo.condition.benefit.product &&
              promo.condition.criteria[0].criterion.uomType ===
                UomTypeEnum.PACK) ||
            (!promo.condition.benefit.product &&
              promo.condition.benefit.maxUomType === UomTypeEnum.PACK)) &&
          !this.parent.item.packUoM
        ) {
          return false;
        }

        return true;
      } else {
        if (
          (promo.condition.scaleUomType === UomTypeEnum.INTERMEDIATE ||
            PromoUtil.isCriteriaContainUomType(
              promo.condition.criteria,
              UomTypeEnum.INTERMEDIATE,
            )) &&
          !this.parent.item.hasIntermediateUoM()
        ) {
          return false;
        }

        if (
          (promo.condition.scaleUomType === UomTypeEnum.PACK ||
            PromoUtil.isCriteriaContainUomType(
              promo.condition.criteria,
              UomTypeEnum.PACK,
            )) &&
          !this.parent.item.packUoM
        ) {
          return false;
        }

        return true;
      }
    }
  }

  public totalBaseQty(): number {
    return (
      (this.qty.value - this.totalPackQty() * this.parent.item.packQty) /
      this.parent.item.baseQty
    );
  }

  public totalPackQty(): number {
    return this.parent.item.hasPackUoM()
      ? Math.floor(this.qty.value / this.parent.item.packQty)
      : 0;
  }

  private getRemainingTagQuota(
    quotaInBaseUom: Quantity,
    tagPurchase: TagCartQuantity,
    ignoredItemIds: string[],
  ): Quantity {
    let remainingQty = quotaInBaseUom;

    const sortedTagItems = tagPurchase.items.sort(
      (a, b) => a.addedAt.getTime() - b.addedAt.getTime(),
    );

    for (const item of sortedTagItems) {
      if (item.itemId === this.parent.item.id) {
        break;
      }

      if (ignoredItemIds.some((i) => i === item.itemId)) {
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

  toJSON(): JsonRegularCartItemProps {
    return {
      base_qty: this.totalBaseQty(),
      pack_qty: this.totalPackQty(),
      total_qty: this.qty.value,
      price: {
        base: {
          listed: this.parent.basePrice.value,
          offered: Math.ceil(
            PromoUtil.resolveOfferedPrice(
              this.parent.basePrice,
              this.calculateMaxDiscountForQty(
                Quantity.create(this.parent.item.baseQty),
              ),
            ).value,
          ),
        },
        pack: this.parent.packPrice
          ? {
              listed: this.parent.packPrice.value,
              offered: Math.ceil(
                PromoUtil.resolveOfferedPrice(
                  this.parent.packPrice,
                  this.calculateMaxDiscountForQty(
                    Quantity.create(this.parent.item.packQty),
                  ),
                ).value,
              ),
            }
          : null,
      },
      coin: this.totalCoin.value,
      promo_labels: this.labels
        .filter((label) => !label.isEmpty)
        .sort((a, b) => {
          if (a.key.type === 'PKWO') {
            return -1;
          }

          if (a.applied === b.applied) {
            if (a.hasTagCriteria) {
              return -1;
            }

            return a.minQty - b.minQty; // Sort by minQty in ascending order
          }
          return b.applied ? 1 : -1; // Sort by applied, with true coming first
        })
        .map((label) => label.toJSON()),
      // discount: this.totalDiscount.value,
      total: this.total.value,
    };
  }
}
