import { Nullable } from '@wings-corporation/core';
import { Money, Quantity } from '@wings-corporation/domain';
import { DiscountType } from '@wings-online/app.constants';
import {
  ItemUom,
  JqkPoint,
  PointConfig,
  PurchasePoint,
  Tag,
} from '@wings-online/cart/domains';
import {
  CartVoucher,
  ICartGeneralVoucher,
  ICartItemVoucher,
} from '@wings-online/cart/interfaces';
import {
  FlashSalePromo,
  LoyaltyPromo,
  RegularPromo,
  TprDirectPromoCondition,
  TprPromo,
  TprPromoCondition,
} from '@wings-online/cart/promotion';
import {
  PointUtil,
  PromoUtil,
  PurchaseQtyByTag,
  ReadModel,
} from '@wings-online/common';

import { FreeProductReadModelList } from '../voucher/domains';
import { FreeProductReadModel } from '../voucher/read-models';
import { CartItemReadModel } from './cart-item.read-model';
import { DeliveryAddressReadModel } from './delivery-address.read-model';

interface JsonCartVoucherProps {
  external_id: string;
  discount_type: DiscountType;
  discount_value: number;
  min_purchase: number;
  max_discount: Nullable<number>;
  item_id?: string;
  item_name?: string;
  grp_02?: string;
  brand_name?: string;
  discount: number;
}

export type JsonCartProps = {
  ship_to: Nullable<{
    id: string;
    label: string;
    name: string;
    address: string;
  }>;
  total_item: number;
  subtotal: number;
  discount: number;
  total_amount: number;
  point: {
    j: number;
    q: number;
    k: number;
  };
  coin: number;
  loyalty: Nullable<{
    applied: boolean;
    min_purchase_amount: number;
    coin: number;
    credit_memo: number;
  }>;
  voucher_discount: number;
  vouchers: Array<JsonCartVoucherProps>;
  updated_at: string;
  upcoming_flash_sale_start_at: Nullable<Date>;
  freezer_qualified: boolean;
  zero_qty_items: {
    id: string;
    name: string;
  }[];
  minimum_purchase_amount: number;
  regular_discount: number;
};

type CartReadModelProps = {
  id: string;
  deliveryAddress: Nullable<DeliveryAddressReadModel>;
  tags: PurchaseQtyByTag[];
  updatedAt: Date;
};

type PurchaseAmountSummary = {
  items: Record<number, Money>;
  tags: Record<string, Money>;
};

export class CartReadModel extends ReadModel {
  public readonly items: CartItemReadModel[] = [];

  private pointConfig: PointConfig | undefined;
  private loyalty: LoyaltyPromo;

  private voucher: ICartGeneralVoucher | undefined;
  private itemVouchers: ICartItemVoucher[] = [];

  private upcomingFlashSale: FlashSalePromo | undefined;
  private freezerQualified: boolean | undefined;
  private minimumPurchaseAmount: Money;
  private itemPromotions: Array<TprPromo | RegularPromo> = [];

  constructor(private readonly props: CartReadModelProps) {
    super();
  }

  get id(): string {
    return this.props.id;
  }

  get tags(): PurchaseQtyByTag[] {
    return this.props.tags;
  }

  get subtotal(): Money {
    return this.items.reduce((total, item) => {
      return total.add(item.subtotal);
    }, Money.zero());
  }

  get discount(): Money {
    return Money.create(
      Math.floor(
        this.items.reduce((total, item) => {
          return total.add(item.totalDiscount);
        }, Money.zero()).value,
      ),
    );
  }

  get coin(): Money {
    let coin = this.items.reduce((total, item) => {
      return total.add(item.coin);
    }, Money.zero());

    if (this.isLoyaltyApplied) {
      coin = coin.add(this.loyaltyCoin);
    }

    return coin;
  }

  get regularDiscount(): Money {
    return this.items.reduce((total, item) => {
      return total.add(item.regularDiscount);
    }, Money.zero());
  }

  get regularTotal(): Money {
    return this.items.reduce((total, item) => {
      return total.add(item.regularTotal);
    }, Money.zero());
  }

  get total(): Money {
    return this.subtotal.subtract(this.discount);
  }

  get purchasePoint(): PurchasePoint {
    return this.pointConfig
      ? PointUtil.calculatePurchasePoint(
          this.total,
          Money.create(this.pointConfig.increments),
        )
      : PurchasePoint.zero();
  }

  get jqkPoint(): JqkPoint {
    return this.purchasePoint.equals(PurchasePoint.zero()) || !this.pointConfig
      ? JqkPoint.zero()
      : PointUtil.calculateJqkPoint(
          this.purchasePoint,
          this.pointConfig.conversionRate,
        );
  }

  get isLoyaltyApplied(): boolean {
    if (this.loyalty) {
      const criteria = this.loyalty.condition.criteria[0];
      return criteria.criterion.isCriterionMet(this.total);
    }
    return false;
  }

  get loyaltyCoin(): Money {
    if (this.loyalty) {
      const criteria = this.loyalty.condition.criteria[0];
      return criteria.benefit.coin?.value || Money.zero();
    }
    return Money.zero();
  }

  get loyaltyCreditMemo(): Money {
    if (this.loyalty) {
      const criteria = this.loyalty.condition.criteria[0];
      return criteria.benefit.creditMemo?.value || Money.zero();
    }
    return Money.zero();
  }

  get loyaltyMinPurchaseAmount(): Money {
    if (this.loyalty) {
      const criteria = this.loyalty.condition.criteria[0];
      return criteria.criterion.amount;
    }
    return Money.zero();
  }

  get deliveryAddress(): Nullable<DeliveryAddressReadModel> {
    return this.props.deliveryAddress;
  }

  get purchaseAmountSummary(): PurchaseAmountSummary {
    const itemMap: Record<number, Money> = {};
    const tagMap: Record<string, Money> = {};
    for (const cartItem of this.items) {
      const totalAmount = cartItem.subtotal;

      const { item } = cartItem;
      const currentItem = itemMap[item.id] || Money.zero();
      itemMap[item.id] = currentItem.add(totalAmount);

      for (const tag of item.tags) {
        const currentTag = tagMap[tag] || Money.zero();
        tagMap[tag] = currentTag.add(totalAmount);
      }
    }

    return {
      items: itemMap,
      tags: tagMap,
    };
  }

  get regularPurchaseAmountSummary(): PurchaseAmountSummary {
    const itemMap: Record<number, Money> = {};
    const tagMap: Record<string, Money> = {};
    for (const cartItem of this.items) {
      const regularTotal = cartItem.regularTotal;

      const { item } = cartItem;
      const currentItem = itemMap[item.id] || Money.zero();
      itemMap[item.id] = currentItem.add(regularTotal);

      for (const tag of item.tags) {
        const currentTag = tagMap[tag] || Money.zero();
        tagMap[tag] = currentTag.add(regularTotal);
      }
    }

    return {
      items: itemMap,
      tags: tagMap,
    };
  }

  get itemVoucherDiscount(): Money {
    const { items, tags } = this.regularPurchaseAmountSummary;

    return this.itemVouchers.reduce<Money>((acc, voucher) => {
      let total = Money.zero();

      if (voucher.target instanceof Tag) {
        total = tags[voucher.target.toString()] || Money.zero();
      } else {
        total = items[voucher.target.value] || Money.zero();
      }

      const discount = this.calculateVoucherDiscount(voucher, total);

      return acc.add(discount);
    }, Money.zero());
  }

  private calculateVoucherDiscount(
    voucher: CartVoucher,
    purchase?: Money,
  ): Money {
    const discountAmount = PromoUtil.resolveMonetaryBenefit(
      voucher.benefit,
      purchase || Money.zero(),
    );

    return voucher.maxDiscount && discountAmount.gte(voucher.maxDiscount)
      ? voucher.maxDiscount
      : discountAmount;
  }

  get totalWithItemVouchers(): Money {
    const itemVoucherDiscount = this.itemVoucherDiscount;
    const total = this.regularTotal;

    if (itemVoucherDiscount.gt(total)) {
      return Money.zero();
    }

    return total.subtract(itemVoucherDiscount);
  }

  get generalVoucherDiscount(): Money {
    if (this.voucher) {
      return this.calculateVoucherDiscount(
        this.voucher,
        this.totalWithItemVouchers,
      );
    } else {
      return Money.zero();
    }
  }

  get voucherDiscount(): Money {
    return this.generalVoucherDiscount.add(this.itemVoucherDiscount);
  }

  get zeroQtyItems(): CartItemReadModel[] {
    return this.items.filter((item) => item.qty.equals(Quantity.zero()));
  }

  get freeItems(): FreeProductReadModelList {
    const freeItems = new Array<FreeProductReadModel>();
    const appliedCombinationPromos = new Array<TprPromo | RegularPromo>();

    for (const item of this.items) {
      for (const promo of this.itemPromotions) {
        if (promo.type !== 'TPR') continue;

        // Check if the promo is applicable to the item
        if (
          !(
            (promo.itemId === '*' &&
              promo.tag &&
              item.item.tags.includes(promo.tag.toString())) ||
            (promo.itemId !== '*' && promo.itemId.value === item.item.id)
          )
        ) {
          continue;
        }

        const promoCondition = (promo as TprPromo).condition;
        const benefit = (promoCondition as TprDirectPromoCondition).benefit
          ?.product;
        if (!benefit) continue;
        if (appliedCombinationPromos.includes(promo)) continue;

        const uoms = {
          base: benefit.freeItem.base,
          intermediate: benefit.freeItem.intermediate,
          pack: benefit.freeItem.pack,
        };

        const isTag = promo.itemId === '*' && promo.tag;
        const qty = isTag
          ? this.tags.find((tag) => tag.tag.equals(promo.tag))?.qty ||
            Quantity.zero()
          : item.qty;

        const freeItemQty = this.calculateFreeItem({
          qty,
          item,
          promo: promoCondition,
          uoms,
        });

        freeItems.push(
          new FreeProductReadModel({
            id: benefit.freeItem.id.value,
            name: benefit.freeItem.name,
            externalId: benefit.freeItem.externalId,
            imageUrl: benefit.freeItem.imageUrl,
            qty: freeItemQty,
            uoms,
          }),
        );

        if (isTag) appliedCombinationPromos.push(promo);
      }
    }

    const freeItemLists = new FreeProductReadModelList();
    freeItems.forEach((freeItem) => freeItemLists.merge(freeItem));

    return freeItemLists;
  }

  private calculateScaleFactor(
    qty: Quantity,
    item: CartItemReadModel,
    promo: TprPromoCondition,
  ): number {
    let divisor = 0;
    if (promo.scaleUomType === 'PACK' && item.item.hasPackUoM()) {
      divisor = promo.scaleQty.value * item.item.packQty;
    } else if (
      promo.scaleUomType === 'INTERMEDIATE' &&
      item.item.hasIntermediateUoM()
    ) {
      divisor = promo.scaleQty.value * item.item.baseQty;
    } else if (promo.scaleUomType === 'BASE') {
      divisor = promo.scaleQty.value;
    }

    return Math.floor(qty.value / divisor);
  }

  private calculateFreeItem(params: {
    qty: Quantity;
    item: CartItemReadModel;
    promo: TprPromoCondition;
    uoms: {
      base: ItemUom;
      intermediate: Nullable<ItemUom>;
      pack: Nullable<ItemUom>;
    };
  }): Quantity {
    const { qty, item, promo, uoms } = params;

    const scaleFactor = this.calculateScaleFactor(qty, item, promo);
    const promoCondition = promo as TprDirectPromoCondition;

    let freeItemQty = 0;
    if (
      promoCondition.benefit.product?.freeItemUomType === 'PACK' &&
      uoms.pack
    ) {
      freeItemQty =
        scaleFactor *
        uoms.pack.contains.value *
        (promoCondition.benefit.product?.freeItemQty || 0);
    } else if (
      promoCondition.benefit.product?.freeItemUomType === 'INTERMEDIATE' &&
      uoms.intermediate
    ) {
      freeItemQty =
        scaleFactor *
        uoms.intermediate.contains.value *
        (promoCondition.benefit.product?.freeItemQty || 0);
    } else if (promoCondition.benefit.product?.freeItemUomType === 'BASE') {
      freeItemQty =
        scaleFactor *
        uoms.base.contains.value *
        (promoCondition.benefit.product?.freeItemQty || 0);
    }

    freeItemQty = this.applyMaximumLimit(freeItemQty, promoCondition, uoms);

    return Quantity.create(freeItemQty);
  }

  private applyMaximumLimit(
    quantity: number,
    promo: TprDirectPromoCondition,
    uoms: {
      base: ItemUom;
      intermediate: Nullable<ItemUom>;
      pack: Nullable<ItemUom>;
    },
  ): number {
    if (!promo.benefit.maxQty || !promo.benefit.maxUomType) return quantity;

    if (promo.benefit.maxUomType === 'PACK') {
      const maxLimit =
        promo.benefit.maxQty.value * (uoms.pack?.contains.value || 1);
      return Math.min(quantity, maxLimit);
    }

    if (promo.benefit.maxUomType === 'INTERMEDIATE') {
      const maxLimit =
        promo.benefit.maxQty.value * (uoms.intermediate?.contains.value || 1);
      return Math.min(quantity, maxLimit);
    }

    return Math.min(quantity, promo.benefit.maxQty.value);
  }

  setPointConfig(config: PointConfig) {
    this.pointConfig = config;
  }

  setDeliveryAddress(address: DeliveryAddressReadModel) {
    this.props.deliveryAddress = address;
  }

  addItem(item: CartItemReadModel) {
    this.items.push(item);
  }

  applyLoyaltyPromo(promo: LoyaltyPromo): void {
    this.loyalty = promo;
  }

  addVoucher(voucher: CartVoucher) {
    if (voucher.type === 'general') {
      this.voucher = voucher;
    } else {
      this.itemVouchers.push(voucher);
    }
  }

  setUpcomingFlashSale(promo: FlashSalePromo) {
    this.upcomingFlashSale = promo;
  }

  /**
   * Set the freezer qualified status
   * @param qualified - true if the user is qualified for freezer, otherwise false
   */
  setFreezerQualified(qualified: boolean) {
    this.freezerQualified = qualified;
  }

  getIsLoyaltyApplied(total: number): boolean {
    if (this.loyalty) {
      const criteria = this.loyalty.condition.criteria[0];
      return criteria.criterion.isCriterionMet(Money.create(total));
    }
    return false;
  }

  setMinimumPurchaseAmount(minimum: Money) {
    this.minimumPurchaseAmount = minimum;
  }

  setItemPromotions(promotions: Array<TprPromo | RegularPromo>) {
    this.itemPromotions = promotions;
  }

  toJSONVouchers(): JsonCartVoucherProps[] {
    const vouchers: JsonCartVoucherProps[] = [];

    if (this.itemVouchers.length) {
      const purchase = this.regularPurchaseAmountSummary;

      for (const voucher of this.itemVouchers) {
        const baseJson = {
          external_id: voucher.id.value,
          discount_type: voucher.benefit.type,
          discount_value: voucher.benefit.value.value,
          min_purchase: voucher.minPurchase.value,
          max_discount: voucher.maxDiscount?.value ?? null,
        };

        if (voucher.target instanceof Tag) {
          vouchers.push({
            ...baseJson,
            discount: this.calculateVoucherDiscount(
              voucher,
              purchase.tags[voucher.target.toString()],
            ).value,
            grp_02: voucher.target.value,
            brand_name: voucher.targetName,
          });
        } else {
          vouchers.push({
            ...baseJson,
            discount: this.calculateVoucherDiscount(
              voucher,
              purchase.items[voucher.target.value],
            ).value,
            item_id: voucher.target.value,
            item_name: voucher.targetName,
          });
        }
      }
    }

    if (this.voucher) {
      vouchers.push({
        external_id: this.voucher.id.value,
        discount_type: this.voucher.benefit.type,
        discount_value: this.voucher.benefit.value.value,
        min_purchase: this.voucher.minPurchase.value,
        max_discount: this.voucher.maxDiscount?.value ?? null,
        discount: this.calculateVoucherDiscount(
          this.voucher,
          this.totalWithItemVouchers,
        ).value,
      });
    }

    return vouchers;
  }

  toJSON(): JsonCartProps {
    const voucherDiscount = this.voucherDiscount.value;

    return {
      ship_to: this.props.deliveryAddress
        ? {
            id: this.props.deliveryAddress.id.value,
            label: this.props.deliveryAddress.label,
            name: this.props.deliveryAddress.name,
            address: this.props.deliveryAddress.address,
          }
        : null,
      total_item: this.items.length,
      subtotal: this.subtotal.value,
      regular_discount: this.regularDiscount.value,
      discount: this.discount.value,
      total_amount: Math.max(this.total.value - voucherDiscount, 0),
      point: {
        j: this.jqkPoint.jack,
        q: this.jqkPoint.queen,
        k: this.jqkPoint.king,
      },
      coin: this.coin.value,
      loyalty: this.loyalty
        ? {
            applied: this.isLoyaltyApplied,
            min_purchase_amount: this.loyaltyMinPurchaseAmount.value,
            coin: this.loyaltyCoin.value,
            credit_memo: this.loyaltyCreditMemo.value,
          }
        : null,
      voucher_discount: voucherDiscount,
      vouchers: this.toJSONVouchers(),
      updated_at: this.props.updatedAt.toISOString(),
      upcoming_flash_sale_start_at: this.upcomingFlashSale
        ? this.upcomingFlashSale.startAt
        : null,
      freezer_qualified: this.freezerQualified || false,
      minimum_purchase_amount: this.minimumPurchaseAmount?.value || 0,
      zero_qty_items: this.zeroQtyItems.map((cartItem) => ({
        id: cartItem.item.id!,
        name: cartItem.item.name!,
      })),
    };
  }
}
