import { DateTime } from 'luxon';

import { Nullable } from '@wings-corporation/core';
import {
  AggregateRoot,
  EntityId,
  Money,
  Percentage,
  Quantity,
  WatchedProps,
} from '@wings-corporation/domain';
import {
  ITEM_VOUCHER_MAX_PERCENTAGE,
  LEGACY_ORDER_DEFAULT_TIMEZONE,
} from '@wings-online/app.constants';
import { CheckoutException } from '@wings-online/cart/exceptions';
import { TagUtil, Uom, UserIdentity } from '@wings-online/common';

import { CartType } from '../cart.constants';
import { DeliveryAddressId } from '../interfaces';
import { PurchaseSummary } from '../interfaces/promotion.interface';
import { LoyaltyPromo } from '../promotion';
import { CartUtils } from '../utils/cart.utils';
import { CheckoutItemVoucherList } from './checkout-item-voucher.list';
import { CheckoutItem } from './checkout-item.entity';
import { CartCheckedOut } from './events';
import { FlashSale } from './flash-sale.vo';
import {
  CheckoutOptions,
  FreeItem,
  ICartVoucherAggregate,
  ICheckoutAggregate,
  PromoCmsRedemption,
} from './interfaces';
import {
  ItemFlashSale,
  ItemLifetimePromotion,
  ItemPromotion,
  ItemRegularPromotions,
} from './item-promotion.entity';
import { ItemVoucher } from './item-voucher.entity';
import { MonetaryBenefit } from './monetary-benefit.vo';
import { FreeProduct, PromoBenefit } from './promo-benefit.vo';
import { PromoPercentage } from './promo-percentage.vo';
import { TPRPromo } from './tpr-promo.vo';
import { GeneralVoucher, Voucher } from './voucher.entity';

type ItemIdValue = string;
type TagString = string;

export type CheckoutSummary = PurchaseSummary;

type CheckoutTag = {
  regular: Quantity;
  flashsale: Quantity;
  subtotal: Money;
};

export type CheckoutTagSummary = Record<TagString, CheckoutTag>;
export type CheckoutItemSummary = Record<ItemIdValue, CheckoutSummary>;

type PurchaseAmountSummary = {
  regular: Money;
  flashsale: Money;
};

export type CheckoutPurchaseAmountSummary = {
  items: Record<ItemIdValue, PurchaseAmountSummary>;
  tags: Record<TagString, PurchaseAmountSummary>;
};

export type CheckoutRequiredProps = {
  identity: UserIdentity;
  type: CartType;
  deliveryAddressId: Nullable<DeliveryAddressId>;
  minimumTotalAmount: Money;
  items: CheckoutItem[];
};

export type CheckoutOptionalProps = Partial<{
  orderDate: Date;
  orderNumber: string;
  generalVoucher: WatchedProps<Nullable<GeneralVoucher>>;
  itemFlashSale: Record<ItemIdValue, ItemFlashSale>;
  itemPromotions: Record<ItemIdValue, ItemRegularPromotions[]>;
  itemLifetimePromotion: Record<ItemIdValue, ItemLifetimePromotion>;
  itemVouchers: CheckoutItemVoucherList;
}>;

export type CheckoutProps = CheckoutRequiredProps & CheckoutOptionalProps;

export type ReconstituteCheckoutProps = Omit<
  CheckoutProps,
  'itemFlashSale' | 'itemPromotions'
> & {
  itemFlashSale: ItemFlashSale[];
  itemRegularPromotions: ItemRegularPromotions[];
  itemLifetimePromotions: ItemLifetimePromotion[];
};

export class CheckoutAggregate
  extends AggregateRoot<Required<CheckoutProps>, string>
  implements ICheckoutAggregate, ICartVoucherAggregate
{
  private constructor(
    props: CheckoutProps,
    id?: string,
    //  logger?: PinoLogger
  ) {
    const orderDate = props.orderDate || new Date();

    super(
      {
        ...props,
        orderDate,
        orderNumber:
          props.orderNumber ||
          CheckoutAggregate.createOrderNumber(
            props.identity.externalId,
            orderDate,
            props.type,
          ),
        generalVoucher: props.generalVoucher || new WatchedProps(null),
        itemFlashSale: props.itemFlashSale || {},
        itemPromotions: props.itemPromotions || {},
        itemVouchers: props.itemVouchers || new CheckoutItemVoucherList(),
        itemLifetimePromotion: props.itemLifetimePromotion || {},
      },
      id ? EntityId.fromString(id) : undefined,
      // logger,
    );

    this.applyItemFlashsale();
    this.applyItemPromotions();
    this.applyItemVouchers();
    this.applyItemLifetimePromotion();
  }
  _loyalty: LoyaltyPromo | null;

  public static create(
    props: CheckoutRequiredProps,
    // logger?: PinoLogger
  ) {
    return new CheckoutAggregate(
      props,
      undefined,
      // logger
    );
  }

  public static reconstitute(
    props: ReconstituteCheckoutProps,
    id: string,
    // logger?: PinoLogger,
  ) {
    return new CheckoutAggregate(
      {
        ...props,
        itemFlashSale: props.itemFlashSale.reduce((acc, curr) => {
          acc[curr.itemId.value] = curr;
          return acc;
        }, {} as Record<ItemIdValue, ItemPromotion<FlashSale>>),
        itemPromotions: props.itemRegularPromotions.reduce((acc, curr) => {
          if (!acc[curr.itemId.value]) acc[curr.itemId.value] = [];
          acc[curr.itemId.value].push(curr);
          return acc;
        }, {} as Record<ItemIdValue, ItemRegularPromotions[]>),
        itemLifetimePromotion: props.itemLifetimePromotions.reduce(
          (acc, curr) => {
            acc[curr.itemId.value] = curr;
            return acc;
          },
          {} as Record<ItemIdValue, ItemLifetimePromotion>,
        ),
      },
      id,
      // logger,
    );
  }

  private static createOrderNumber(
    externalId: string,
    orderDate: Date,
    type: CartType,
  ): string {
    const formattedTimestamp = DateTime.fromJSDate(orderDate)
      .setZone(LEGACY_ORDER_DEFAULT_TIMEZONE)
      .toFormat('ddMMyyyyHHmmss');

    const suffix = type === 'FROZEN' ? 'FR' : '';
    return `${formattedTimestamp}${suffix}.${externalId}`;
  }

  public checkout(options: CheckoutOptions): void {
    const { deliveryDate, buyerLocation, isSimulatePrice } = options;
    if (this._props.items.length <= 0)
      throw new CheckoutException.CartIsEmpty();

    const notSellableItems = this._props.items.filter(
      (x) => !x.isBaseSellable && !x.isPackSellable,
    );
    if (notSellableItems.length > 0) {
      throw new CheckoutException.ItemsCannotBeCheckedout();
    }

    const itemsWithNoPrice = this._props.items.filter((x) => !x.price?.value);
    if (itemsWithNoPrice.length > 0) {
      throw new CheckoutException.ItemsCannotBeCheckedout();
    }

    const minAmount = this._props.minimumTotalAmount;

    if (this.total.lt(minAmount)) {
      throw new CheckoutException.MinimumOrderNotMet(this.total, minAmount);
    }

    this.generalVoucher && this.validateGeneralVoucher(this.generalVoucher);
    if (this.props.itemVouchers.getItems().length > 0) {
      for (const voucher of this.props.itemVouchers.getItems()) {
        this.validateItemVoucher(voucher);
      }
    }

    this.validateVouchersMaxDiscount();

    const itemsWithNonFactorQty = this._props.items
      .filter((item) => item.qty.value % item.factorValue !== 0)
      .map((x) => ({
        itemId: x.itemId.value,
        qty: x.qty.value,
        salesFactor: x.factorValue,
      }));

    if (itemsWithNonFactorQty.length > 0) {
      throw new CheckoutException.QuantityMustBeAFactorOf(
        itemsWithNonFactorQty,
      );
    }

    // TODO find a better way to ensure that identity has the necessary information same as the cart
    const divisionInfo =
      this.props.type === 'DRY'
        ? this.props.identity.division.dry!
        : this.props.identity.division.frozen!;

    const event = new CartCheckedOut({
      orderNumber: this._props.orderNumber,
      orderDate: this._props.orderDate,
      deliveryDate,
      cartId: this.id.value,
      deliveryAddressId: this.props.deliveryAddressId?.value || null,
      buyer: {
        id: this._props.identity.id,
        externalId: this._props.identity.externalId,
        salesOrg: divisionInfo.salesOrg,
        distChannel: divisionInfo.distChannel,
        salesOffice: divisionInfo.salesOffice,
        group: divisionInfo.group,
        location: buyerLocation,
      },
      items: this._props.items.map((x) => ({
        qty: x.qty.value,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        price: x.price!.value,
        recommendationType: x.recommendationType,
        flashSale: {
          qty: x.flashSaleQty.value,
          discount: x.flashSaleDiscount.value,
          coin: x.flashSaleCoin.value,
          externalId: x.flashSaleExternalId,
        },
        promotion: {
          qty: x.promotionQty.value,
          discount: x.promotionDiscount.value,
          coin: x.promotionCoin.value,
          regularPromoExternalId: x.promoExternalId,
        },
        item: {
          id: x.itemId.value,
          externalId: x.externalId.value,
          description: x.description,
          baseUom: x.baseUom.name,
          packUom: x.packUom ? x.packUom.name : null,
          baseQty: x.baseUom.packQty.value,
          packQty: x.packUom?.packQty.value || 1,
          tags: TagUtil.toStringArray(x.tags),
        },
        voucherId: x.appliedVoucher?.id.value || null,
      })),
      subtotal: this.subtotal.value,
      discount: this.discount.value,
      total: this.total.value,
      generalVoucher: this.generalVoucher
        ? {
            id: this.generalVoucher.id.value,
            discount: this.generalVoucherDiscount.value,
            percentage:
              this.generalVoucher.discount.type === 'PERCENTAGE'
                ? this.generalVoucher.discount.value
                : null,
            minPurchase: this.generalVoucher.minPurchase.value,
            maxDiscount: this.generalVoucher.maxDiscount
              ? this.generalVoucher.maxDiscount.value
              : null,
          }
        : null,
      itemVouchers: this.props.itemVouchers.currentItems.map((v) => ({
        id: v.id.value,
        discount: this.itemVoucherDiscount[v.id.value]?.value || 0,
        percentage: v.discount.type === 'PERCENTAGE' ? v.discount.value : null,
        minPurchase: v.minPurchaseAmount.value,
        maxDiscount: v.maxDiscount ? v.maxDiscount.value : null,
      })),
      freeItems: this.freeItems,
      isSimulatePrice,
      identity: this._props.identity,
    });

    this.raise(event);
  }

  get type(): CartType {
    return this._props.type;
  }

  get orderNumber(): string {
    return this._props.orderNumber;
  }

  get subtotal(): Money {
    return this._props.items.reduce((total: Money, current) => {
      return total.add(current.subtotal);
    }, Money.zero());
  }

  get discount(): Money {
    return Money.create(
      Math.floor(
        this._props.items.reduce((total: Money, item) => {
          const flashSale = item.totalFlashSaleDiscount;
          const promotion = item.totalPromotionDiscount;
          return total.add(flashSale).add(promotion);
        }, Money.zero()).value,
      ),
    );
  }

  get loyalty(): LoyaltyPromo | null {
    return this._loyalty;
  }

  get loyaltyCoin(): Money {
    if (this.loyalty) {
      const criteria = this.loyalty.condition.criteria[0];
      return criteria.benefit.coin?.value || Money.zero();
    }
    return Money.zero();
  }

  get coin(): Money {
    const promoCoin = this._props.items.reduce((total: Money, item) => {
      const flashSale = item.flashSaleCoin;
      const promotion = item.promotionCoin;
      return total.add(flashSale).add(promotion);
    }, Money.zero());

    return promoCoin.add(this.loyaltyCoin);
  }

  get items(): CheckoutItem[] {
    return this.props.items;
  }

  get totalRegular(): Money {
    return this._props.items.reduce((total: Money, item) => {
      return total.add(item.totalRegular);
    }, Money.zero());
  }

  get total(): Money {
    try {
      return this.subtotal.subtract(this.discount);
    } catch (error) {
      return Money.zero();
    }
  }

  get summary(): CheckoutSummary {
    return this._props.items.reduce<CheckoutSummary>(
      (acc, item) => {
        acc.items[item.itemId.value] = {
          qty: item.qty,
          qtyIntermediate: item.qtyIntermediate,
          qtyPack: item.qtyPack,
          subtotal: item.subtotal,
          addedAt: item.addedAt,
        };

        item.tags.forEach((tag) => {
          if (!acc.tags[tag.toString()]) {
            acc.tags[tag.toString()] = {
              qty: Quantity.zero(),
              qtyIntermediate: Quantity.zero(),
              qtyPack: Quantity.zero(),
              subtotal: Money.zero(),
              items: [],
            };
          }

          acc.tags[tag.toString()] = {
            qty: acc.tags[tag.toString()].qty.add(item.qty),
            qtyIntermediate: acc.tags[tag.toString()].qtyIntermediate.add(
              item.qtyIntermediate,
            ),
            qtyPack: acc.tags[tag.toString()].qtyPack.add(item.qtyPack),
            subtotal: acc.tags[tag.toString()].subtotal.add(item.subtotal),
            items: acc.tags[tag.toString()].items.concat(
              !acc.items[item.itemId.value].qty.equals(Quantity.zero())
                ? {
                    ...acc.items[item.itemId.value],
                    itemId: item.itemId,
                  }
                : [],
            ),
          };
        });

        return acc;
      },
      {
        items: {},
        tags: {},
      },
    );
  }

  get tagSummary(): CheckoutTagSummary {
    return this._props.items.reduce<CheckoutTagSummary>((acc, item) => {
      item.tags.forEach((tag) => {
        const currentTotal: CheckoutTag = acc[tag.toString()] || {
          regular: Quantity.zero(),
          flashsale: Quantity.zero(),
          subtotal: Money.zero(),
        };
        acc[tag.toString()] = {
          regular: currentTotal.regular.add(item.promotionQty),
          flashsale: currentTotal.flashsale.add(item.flashSaleQty),
          subtotal: currentTotal.subtotal.add(item.subtotal),
        };
      });
      return acc;
    }, {});
  }

  get generalVoucher(): Nullable<GeneralVoucher> {
    return this.props.generalVoucher.getCurrentProps();
  }

  get generalVoucherDiscount(): Money {
    return this.generalVoucher
      ? this.getVouchersDiscount(
          this.props.itemVouchers.getItems(),
          this.generalVoucher,
        )[this.generalVoucher.id.value] || Money.zero()
      : Money.zero();
  }

  get itemVoucherDiscount(): Record<string, Money> {
    return this.getVouchersDiscount(this.props.itemVouchers.getItems());
  }

  get purchaseAmountSummary(): CheckoutPurchaseAmountSummary {
    const itemMap: Record<ItemIdValue, PurchaseAmountSummary> = {};
    const tagMap: Record<TagString, PurchaseAmountSummary> = {};
    for (const item of this.props.items) {
      if (!item.price) continue;

      const currentItem = itemMap[item.itemId.value] || {
        regular: Money.zero(),
        flashsale: Money.zero(),
      };
      itemMap[item.itemId.value] = {
        regular: currentItem.regular.add(item.totalRegular),
        flashsale: currentItem.flashsale.add(item.totalFlashSale),
      };

      for (const tag of item.tags) {
        const currentTag = tagMap[tag.toString()] || {
          regular: Money.zero(),
          flashsale: Money.zero(),
        };
        tagMap[tag.toString()] = {
          regular: currentTag.regular.add(item.totalRegular),
          flashsale: currentTag.flashsale.add(item.totalFlashSale),
        };
      }
    }

    return {
      items: itemMap,
      tags: tagMap,
    };
  }

  get deliveryAddressId(): Nullable<DeliveryAddressId> {
    return this.props.deliveryAddressId;
  }

  getQtyByTag(tag: string): Quantity {
    return this.items
      .filter((item) => item.tags.some((t) => t.toString() === tag))
      .reduce((qty, item) => qty.add(item.qty), Quantity.zero());
  }

  get freeItems(): Array<FreeItem> {
    const freeItems: Array<{
      externalId: string;
      name: Nullable<string>;
      targetId: string;
      qty: Quantity;
      uom: {
        base: Uom;
        intermediate: Nullable<Uom>;
        pack: Nullable<Uom>;
      };
    }> = [];

    for (const item of this.items) {
      const appliedPromos = this.itemPromotions[item.itemId.value];
      if (!appliedPromos?.length) continue;

      const promoWithFreeProducts = appliedPromos.filter(
        (promo) =>
          promo.promotion instanceof TPRPromo &&
          promo.promotion.condition.criteria[0].benefit.freeProduct,
      );
      if (!promoWithFreeProducts.length) continue;

      for (const promo of promoWithFreeProducts) {
        const freeProductPromo = promo.promotion as TPRPromo;

        const isApplied = freeItems.some(
          (item) => item.targetId === freeProductPromo.targetId,
        );
        if (isApplied) continue;

        const benefit = freeProductPromo.condition.criteria[0].benefit;
        const freeProduct = benefit.freeProduct as FreeProduct;
        const qty =
          freeProductPromo.targetTag !== '*'
            ? this.getQtyByTag(freeProductPromo.targetTag).value
            : item.qty.value;

        const scaleFactor = this.calculateScaleFactor(qty, item, benefit);
        let freeItemQuantity = this.calculateFreeItemQuantity(
          scaleFactor,
          freeProduct,
        );

        freeItemQuantity = this.applyMaximumLimit(
          freeItemQuantity,
          benefit,
          freeProduct,
        );

        if (!freeItemQuantity) {
          continue;
        }

        const existingItem = freeItems.find(
          (item) => freeProduct.externalId === item.externalId,
        );

        if (existingItem) {
          existingItem.qty = existingItem.qty.add(
            Quantity.create(freeItemQuantity),
          );
        } else {
          freeItems.push({
            externalId: freeProduct.externalId,
            name: freeProduct.name,
            targetId: freeProductPromo.targetId,
            qty: Quantity.create(freeItemQuantity),
            uom: {
              base: freeProduct.baseUom,
              intermediate: freeProduct.intermediateUom,
              pack: freeProduct.packUom,
            },
          });
        }
      }
    }

    return this.getFreeItemSummary(freeItems);
  }

  private calculateScaleFactor(
    qty: number,
    item: CheckoutItem,
    benefit: PromoBenefit,
  ): number {
    const divisor =
      benefit.scaleUomType === 'PACK'
        ? benefit.scaleQty.value * item.packQty.value
        : benefit.scaleUomType === 'INTERMEDIATE'
        ? benefit.scaleQty.value * item.baseQty.value
        : benefit.scaleQty.value;

    return Math.floor(qty / divisor);
  }

  private calculateFreeItemQuantity(
    scaleFactor: number,
    freeProduct: FreeProduct,
  ): number {
    if (freeProduct.uom === 'PACK') {
      return (
        scaleFactor *
        freeProduct.qty.value *
        (freeProduct.packUom?.packQty.value || 1)
      );
    }

    if (freeProduct.uom === 'INTERMEDIATE') {
      return (
        scaleFactor *
        (freeProduct.qty.value || 1) *
        (freeProduct.intermediateUom?.packQty.value || 1)
      );
    }

    return (
      scaleFactor *
      (freeProduct.qty.value || 1) *
      (freeProduct.baseUom.packQty.value || 1)
    );
  }

  private applyMaximumLimit(
    quantity: number,
    benefit: PromoBenefit,
    freeProduct: FreeProduct,
  ): number {
    if (!benefit.maxQty) return quantity;

    if (benefit.maxUomType === 'PACK') {
      const maxLimit =
        benefit.maxQty.value * (freeProduct.packUom?.packQty.value || 1);
      return Math.min(quantity, maxLimit);
    }

    if (benefit.maxUomType === 'INTERMEDIATE') {
      const maxLimit =
        benefit.maxQty.value *
        (freeProduct.intermediateUom?.packQty.value || 1);
      return Math.min(quantity, maxLimit);
    }

    return Math.min(quantity, benefit.maxQty.value);
  }

  private getFreeItemSummary(
    items: Array<{
      externalId: string;
      name: Nullable<string>;
      targetId: string;
      qty: Quantity;
      uom: {
        base: Uom;
        intermediate: Nullable<Uom>;
        pack: Nullable<Uom>;
      };
    }>,
  ): Array<FreeItem> {
    return items.map((item) => {
      const baseUom = item.uom.base;
      const intermediateUom = item.uom.intermediate;
      const packUom = item.uom.pack;

      const base = {
        qty: 0,
        uom: 'PCS',
      };
      const pack = {
        qty: 0,
        uom: 'BOX',
      };

      let freeQty = item.qty.value;
      let packQty = 0;
      let intermediateQty = 0;
      if (packUom) {
        packQty = Math.floor(freeQty / packUom.packQty.value);
        freeQty -= packQty * packUom.packQty.value;
      }

      if (intermediateUom) {
        intermediateQty = Math.floor(freeQty / intermediateUom.packQty.value);
        freeQty -= intermediateQty * intermediateUom.packQty.value;
      }

      if (packQty > 0 && packUom) {
        pack.uom = packUom.name;
        pack.qty = packQty;
      }

      if (intermediateQty > 0 && intermediateUom) {
        if (freeQty > 0) {
          if (packQty > 0) {
            base.qty =
              freeQty + intermediateQty * intermediateUom.packQty.value;
            base.uom = baseUom.name;
          } else {
            base.qty = freeQty;
            base.uom = baseUom.name;

            pack.qty = intermediateQty;
            pack.uom = intermediateUom.name;
          }
        } else {
          base.qty = intermediateQty;
          base.uom = intermediateUom.name;
        }
      }

      if (freeQty > 0 && intermediateQty <= 0) {
        base.qty = freeQty;
        base.uom = baseUom.name;
      }

      // set to valid uom
      if (pack.qty === 0 && packUom) {
        pack.uom = packUom.name;
      } else if (base.qty === 0 && intermediateUom) {
        base.uom = intermediateUom.name;
      }

      return {
        externalId: item.externalId,
        name: item.name,
        baseQty: base.qty,
        packQty: pack.qty,
        baseUom: base.uom,
        packUom: pack.uom,
      };
    });
  }

  setDeliveryAddress(id: DeliveryAddressId) {
    this.props.deliveryAddressId = id;
  }

  applyVoucher(voucher: Voucher, withValidation = true): void {
    if (voucher.isGeneral) {
      const currentVoucher = voucher as GeneralVoucher;
      withValidation && this.validateGeneralVoucher(currentVoucher);
      if (
        !this.props.generalVoucher.getCurrentProps()?.equals(currentVoucher)
      ) {
        currentVoucher.setAppliedAt(new Date());
        this.props.generalVoucher.setCurrentProps(currentVoucher);
      }
    } else {
      const currentVoucher = voucher as ItemVoucher;
      withValidation && this.validateItemVoucher(currentVoucher);
      if (!this.props.itemVouchers.exists(currentVoucher)) {
        currentVoucher.setAppliedAt(new Date());
        this.props.itemVouchers.add(currentVoucher);
      }
      this.applyVoucherToItems(currentVoucher);
    }
  }

  unapplyVoucher(voucherId: string): void {
    if (this.generalVoucher?.id.value === voucherId) {
      this.props.generalVoucher.setCurrentProps(null);
    } else {
      const matchedVoucher = this.props.itemVouchers.currentItems.find(
        (i) => i.id.value === voucherId,
      );
      if (matchedVoucher) {
        this.props.itemVouchers.remove(matchedVoucher);
      }
    }
  }

  setLoyalty(loyalty: LoyaltyPromo): void {
    this._loyalty = loyalty;
  }

  private applyItemFlashsale(): void {
    this._props.items.forEach((item) => {
      const flashSale = this.props.itemFlashSale[item.itemId.value];
      if (flashSale) {
        item.applyFlashSale(flashSale.promotion);
      }
    });
  }

  private applyItemVouchers(): void {
    for (const voucher of this.props.itemVouchers.currentItems) {
      this.applyVoucherToItems(voucher);
    }
  }

  private applyItemPromotions(): void {
    const summary = this.summary;
    this._props.items.forEach((item) => {
      const itemPromotions = this.props.itemPromotions[item.itemId.value] || [];
      item.setCheckoutSummary(summary);
      itemPromotions.forEach((itemPromo) => {
        item.addPromotion(itemPromo.promotion);
      });
    });
  }

  private applyItemLifetimePromotion(): void {
    this._props.items.forEach((item) => {
      const itemLifetimePromotion =
        this.props.itemLifetimePromotion[item.itemId.value];
      itemLifetimePromotion &&
        item.applyLifetimePromotion(itemLifetimePromotion.promotion);
    });
  }

  private getVouchersDiscount(
    itemVouchers: ItemVoucher[],
    generalVoucher?: GeneralVoucher,
  ): Record<string, Money> {
    const { items, tags } = this.purchaseAmountSummary;

    const vouchers = itemVouchers.reduce<Record<string, Money>>((acc, iv) => {
      try {
        this.validateItemVoucher(iv);
      } catch (error) {
        acc[iv.id.value] = Money.zero();
        return acc;
      }

      let totalAmount = Money.zero();
      if (iv.target instanceof EntityId) {
        totalAmount = items[iv.target.value]?.regular || Money.zero();
      } else {
        totalAmount = tags[iv.target.toString()]?.regular || Money.zero();
      }
      acc[iv.id.value] = CartUtils.calculateVoucherDiscount(iv, totalAmount);
      return acc;
    }, {});

    const itemVoucherTotalDiscount = Object.values(vouchers).reduce<Money>(
      (acc, val) => {
        return acc.add(val);
      },
      Money.zero(),
    );

    if (generalVoucher) {
      try {
        this.validateGeneralVoucher(generalVoucher);
        vouchers[generalVoucher.id.value] = CartUtils.calculateVoucherDiscount(
          generalVoucher,
          this.total.subtract(itemVoucherTotalDiscount),
        );
      } catch (error) {
        vouchers[generalVoucher.id.value] = Money.zero();
      }
    }
    return vouchers;
  }

  private validateGeneralVoucher(voucher: GeneralVoucher): void {
    if (this.totalRegular.lt(voucher.minPurchase)) {
      throw new CheckoutException.VoucherMinimumPurchaseNotMet(
        voucher,
        this.total,
      );
    }
  }

  private validateItemVoucher(voucher: ItemVoucher): void {
    const impactedItems = this.getImpactedItems(voucher);

    if (impactedItems.length === 0) {
      const tagQtyMap = this.tagSummary;
      const purchaseSummary = this.purchaseAmountSummary;

      const { target } = voucher;
      let currentQty = Quantity.zero();
      let currentAmount = Money.zero();
      if (target instanceof EntityId) {
        const matchingItem = this.props.items.find((i) =>
          i.itemId.equals(target),
        );
        if (matchingItem) {
          currentQty = matchingItem.promotionQty;
          currentAmount =
            purchaseSummary.items[matchingItem.itemId.value]?.regular;
        }
      } else {
        currentQty = tagQtyMap[target.toString()]?.regular || Quantity.zero();
        currentAmount =
          purchaseSummary.tags[target.toString()]?.regular || Money.zero();
      }

      if (currentQty.lt(voucher.minPurchaseQty)) {
        throw new CheckoutException.VoucherItemNotInCart(voucher);
      }

      if (currentAmount.lt(voucher.minPurchaseAmount)) {
        throw new CheckoutException.VoucherMinimumPurchaseNotMet(
          voucher,
          currentAmount,
        );
      }
    }
  }

  private applyVoucherToItems(voucher: ItemVoucher): void {
    const impactedItems = this.getImpactedItems(voucher);

    if (impactedItems.length > 0) {
      // apply discount to each impacted item
      for (const impactedItem of impactedItems) {
        impactedItem.applyVoucher(voucher);
      }
    }
  }

  private getImpactedItems(voucher: ItemVoucher): CheckoutItem[] {
    const tagQtyMap = this.tagSummary;
    const purchaseSummary = this.purchaseAmountSummary;

    // filter item that will receive the benefit
    return this.props.items.filter((item) => {
      if (voucher.target instanceof EntityId) {
        return voucher.check(item.itemId, item.promotionQty, item.totalRegular);
      } else {
        return item.tags.some((tag) => {
          const totalQty =
            tagQtyMap[tag.toString()]?.regular || Quantity.zero();
          return voucher.check(
            tag,
            totalQty,
            purchaseSummary.tags[tag.toString()]?.regular || Money.zero(),
          );
        });
      }
    });
  }

  get sortedVouchers(): Voucher[] {
    // sort vouchers by appliedAt date starting from the last applied
    return (this.props.itemVouchers.getItems() as Voucher[])
      .concat(this.generalVoucher ? [this.generalVoucher] : [])
      .sort((a, b) =>
        a.appliedAt && b.appliedAt
          ? b.appliedAt.getTime() - a.appliedAt.getTime()
          : 0,
      );
  }

  public validateVouchersMaxDiscount() {
    const maxDiscount = MonetaryBenefit.create(
      PromoPercentage.create(ITEM_VOUCHER_MAX_PERCENTAGE),
    ).calculate(this.total);

    const vouchersDiscount = this.getVouchersDiscount(
      this.props.itemVouchers.getItems(),
      this.generalVoucher || undefined,
    );

    const totalDiscount = Object.values(vouchersDiscount).reduce<Money>(
      (acc, val) => {
        return acc.add(val);
      },
      Money.zero(),
    );

    if (totalDiscount.gt(maxDiscount)) {
      let currentDiscount = totalDiscount;
      const suggestedVouchersToUnapply = new Array<Voucher>();

      // suggest vouchers to unapply starting from the last applied
      this.sortedVouchers.forEach((voucher) => {
        if (currentDiscount.gt(maxDiscount)) {
          if (!vouchersDiscount[voucher.id.value].equals(Money.zero())) {
            suggestedVouchersToUnapply.push(voucher);
            currentDiscount = currentDiscount.subtract(
              vouchersDiscount[voucher.id.value],
            );
          }
        } else {
          return;
        }
      });

      throw new CheckoutException.VoucherExceedMaxDiscount(
        suggestedVouchersToUnapply.map((v) => v.id),
        totalDiscount,
        maxDiscount,
        Percentage.create(ITEM_VOUCHER_MAX_PERCENTAGE),
      );
    }
  }

  public checkSimulatedPrice() {
    const exists = this.props.items.every((item) => !!item.simulatedPrice);
    if (!exists) {
      throw new CheckoutException.InvalidSimulatedPrice();
    }

    const diff = this.props.items.some(
      (item) =>
        !!this.props.itemFlashSale[item.itemId.value] !==
        !!item.simulatedPrice?.flashSaleDiscount.value,
    );

    if (diff) {
      throw new CheckoutException.FlashSaleItemChanged();
    }
  }

  get promoCmsRedemptions(): PromoCmsRedemption[] {
    const promoCmsRedemptions: Record<string, Quantity> = {};
    this.props.items.forEach((item) => {
      if (!item.flashSaleQty.equals(Quantity.zero())) {
        promoCmsRedemptions[
          this.props.itemFlashSale[item.itemId.value].promotion.criteriaId
        ] = (
          promoCmsRedemptions[
            this.props.itemFlashSale[item.itemId.value].promotion.criteriaId
          ] || Quantity.zero()
        ).add(item.flashSaleQty);
      }
    });
    return Object.keys(promoCmsRedemptions).map((criteriaId) => ({
      criteriaId,
      qty: promoCmsRedemptions[criteriaId],
    }));
  }

  get itemPromotions(): Record<ItemIdValue, ItemRegularPromotions[]> {
    return this.props.itemPromotions;
  }
}
