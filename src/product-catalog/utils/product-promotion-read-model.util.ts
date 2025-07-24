import { Money, Quantity } from '@wings-corporation/domain';
import { TagKey } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';
import { PromoUtil } from '@wings-online/common';

import {
  DirectPromotionReadModel,
  ProductReadModel,
  PromotionReadModel,
  StrataPromotionCondition,
} from '../read-models';
import {
  isDirectPromotion,
  isMinimumPurchaseCondition,
  PromotionCondition,
} from '../read-models/index';

export class ProductPromotionReadModelUtil {
  public static isPromotionApplied(
    promotion: PromotionReadModel,
    product: ProductReadModel,
    qty: Quantity,
  ) {
    if (qty.equals(Quantity.zero())) {
      return false;
    }

    if (isDirectPromotion(promotion)) {
      let qty = product.cartQty;

      if (promotion.condition.benefit.product) {
        const isTag = promotion.target.tag !== '*';
        if (isTag && qty.gt(Quantity.zero())) {
          const [key, value] = promotion.target.tag.split(':');
          qty = product.qtyInCart.byTag(
            Tag.create({ key: key as TagKey, value }),
          ).qty;
        }
      }

      return (
        qty.gt(Quantity.zero()) &&
        this.isConditionMet(promotion.target, promotion.condition, product)
      );
    } else {
      return (
        qty.gt(Quantity.zero()) &&
        promotion.conditions.filter((condition) => {
          return this.isConditionMet(promotion.target, condition, product);
        }).length === promotion.conditions.length
      );
    }
  }

  public static isConditionMet(
    target: {
      tag: string;
      itemId: string;
    },
    condition: PromotionCondition,
    product: ProductReadModel,
  ): boolean {
    if (isMinimumPurchaseCondition(condition)) {
      if (target.tag === '*' && target.itemId !== '*') {
        const minQty =
          condition.minQtyUomType === 'BASE'
            ? Quantity.create(condition.minQty)
            : condition.minQtyUomType === 'INTERMEDIATE'
            ? Quantity.create(condition.minQty * product.baseQty.value)
            : Quantity.create(condition.minQty * product.packQty.value);
        return product.cartQty.gte(minQty);
      } else {
        const tagQty = product.qtyInCart.byTag(Tag.fromString(target.tag));

        if (condition.tagCriteria) {
          const includedTagQty = condition.tagCriteria.includedTag
            ? product.qtyInCart.byTag(condition.tagCriteria.includedTag)
            : undefined;

          const isTagCriteriaMet = PromoUtil.isTagCriteriaMet({
            tagCriteria: {
              ...condition.tagCriteria,
              minQty: condition.minQty,
              minUomType: condition.minQtyUomType,
            },
            tagPurchase: {
              qty: tagQty.qty,
              items: tagQty.items,
            },
            itemsPurchase: condition.tagCriteria.items.reduce((acc, item) => {
              const cartQty = product.qtyInCart.byItem(item.id);
              acc[item.id] = {
                qty: cartQty.qty,
              };
              return acc;
            }, {}),
            includedTagPurchase: includedTagQty
              ? {
                  qty: includedTagQty.qty,
                  items: includedTagQty.items,
                }
              : undefined,
            uomConversion: {
              base: product.baseQty,
              pack: product.packQty,
            },
          });

          return isTagCriteriaMet;
        } else {
          const minQty =
            condition.minQtyUomType === 'BASE'
              ? condition.minQty
              : condition.minQtyUomType === 'INTERMEDIATE'
              ? condition.minQty * product.baseQty.value
              : condition.minQty * product.packQty.value;

          const isMinQtyMet = tagQty.qty.gte(Quantity.create(minQty));

          return isMinQtyMet;
        }
      }
    } else {
      return product.price
        .multiply(product.cartQty)
        .gte(Money.create(condition.minAmount));
    }
  }

  public static calculatePromotionDiscount(
    promotion: PromotionReadModel,
    price: Money,
    product: ProductReadModel,
  ) {
    let discount = Money.zero();
    if (isDirectPromotion(promotion)) {
      discount = this.calculateDirectPromotionDiscount(
        promotion,
        price,
        product,
      );
    } else {
      if (promotion.conditions.length) {
        discount = this.calculateStrataConditionDiscount(
          promotion.highestCondition,
          price,
          product,
        );
      }
    }

    if (discount.gte(product.price)) {
      return product.price;
    }

    return discount;
  }

  public static calculateDirectPromotionDiscount(
    promotion: DirectPromotionReadModel,
    price: Money,
    product: ProductReadModel,
  ): Money {
    let baseDiscount = Money.create(0);

    const discountBenefits = promotion.benefit.discount;

    for (const benefit of discountBenefits) {
      const priceAfterDiscount = price.gte(baseDiscount)
        ? price.subtract(baseDiscount)
        : Money.zero();

      if (priceAfterDiscount.equals(Money.zero())) {
        break;
      }

      if (benefit.type === 'PERCENTAGE') {
        baseDiscount = baseDiscount.add(
          Money.create((priceAfterDiscount.value * benefit.value) / 100),
        );
      } else {
        const discountUomType = benefit.scaleUomType;

        if (discountUomType === 'BASE') {
          baseDiscount = baseDiscount.add(Money.create(benefit.value));
        } else if (discountUomType === 'INTERMEDIATE') {
          baseDiscount = baseDiscount.add(
            Money.create(benefit.value / product.baseQty.value),
          );
        } else {
          baseDiscount = baseDiscount.add(
            Money.create(benefit.value / product.packQty.value),
          );
        }
      }
    }

    return baseDiscount;
  }

  public static calculateStrataConditionDiscount(
    condition: StrataPromotionCondition,
    price: Money,
    product: ProductReadModel,
  ) {
    let baseDiscount = Money.create(0);

    const discountBenefits = condition.benefit.discount;

    for (const benefit of discountBenefits) {
      const priceAfterDiscount = price.gte(baseDiscount)
        ? price.subtract(baseDiscount)
        : Money.zero();

      if (priceAfterDiscount.equals(Money.zero())) {
        break;
      }

      if (benefit.type === 'PERCENTAGE') {
        baseDiscount = baseDiscount.add(
          Money.create((priceAfterDiscount.value * benefit.value) / 100),
        );
      } else {
        const discountUomType = benefit.scaleUomType;
        if (discountUomType === 'BASE') {
          baseDiscount = baseDiscount.add(Money.create(benefit.value));
        } else if (discountUomType === 'INTERMEDIATE') {
          baseDiscount = baseDiscount.add(
            Money.create(benefit.value / product.baseQty.value),
          );
        } else {
          baseDiscount = baseDiscount.add(
            Money.create(benefit.value / product.packQty.value),
          );
        }
      }
    }
    return baseDiscount;
  }

  public static calculateDirectPromotionCoin(
    promotion: DirectPromotionReadModel,
    price: Money,
    product: ProductReadModel,
  ): Money {
    const coinBenefits = promotion.benefit.coin;

    let baseCoin = Money.zero();
    let basePrice = price;
    for (const coinBenefit of coinBenefits) {
      basePrice = price.gte(baseCoin) ? price.subtract(baseCoin) : Money.zero();

      if (basePrice.equals(Money.zero())) {
        break;
      }

      if (coinBenefit.type === 'PERCENTAGE') {
        baseCoin = baseCoin.add(
          Money.create((basePrice.value * coinBenefit.value) / 100),
        );
      } else {
        const discountUomType = coinBenefit.scaleUomType;
        if (discountUomType === 'BASE') {
          baseCoin = baseCoin.add(Money.create(coinBenefit.value));
        } else if (discountUomType === 'INTERMEDIATE') {
          baseCoin = baseCoin.add(
            Money.create(coinBenefit.value / product.baseQty.value),
          );
        } else {
          baseCoin = baseCoin.add(
            Money.create(coinBenefit.value / product.packQty.value),
          );
        }
      }
    }
    return baseCoin;
  }

  public static calculateStrataConditionCoin(
    condition: StrataPromotionCondition,
    price: Money,
    product: ProductReadModel,
  ): Money {
    const coinBenefits = condition.benefit.coin;

    let basePrice = price;
    let baseCoin = Money.zero();
    for (const coinBenefit of coinBenefits) {
      basePrice = price.gte(baseCoin) ? price.subtract(baseCoin) : Money.zero();

      if (basePrice.equals(Money.zero())) {
        break;
      }

      if (coinBenefit.type === 'PERCENTAGE') {
        baseCoin = baseCoin.add(
          Money.create((basePrice.value * coinBenefit.value) / 100),
        );
      } else {
        const coinUomType = coinBenefit.scaleUomType;
        if (coinUomType === 'BASE') {
          baseCoin = baseCoin.add(Money.create(coinBenefit.value));
        } else if (coinUomType === 'INTERMEDIATE') {
          baseCoin = baseCoin.add(
            Money.create(coinBenefit.value / product.baseQty.value),
          );
        } else {
          baseCoin = baseCoin.add(
            Money.create(coinBenefit.value / product.packQty.value),
          );
        }
      }
    }

    return baseCoin;
  }
}
