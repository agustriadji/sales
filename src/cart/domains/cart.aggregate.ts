import { Nullable } from '@wings-corporation/core';
import {
  AggregateRoot,
  EntityId,
  Money,
  Quantity,
} from '@wings-corporation/domain';
import { TagKeys } from '@wings-online/app.constants';
import { CartException } from '@wings-online/cart/exceptions';
import {
  BuyerId,
  MathUtil,
  SalesUtil,
  UserIdentity,
} from '@wings-online/common';

import { CartType } from '../cart.constants';
import { CartItem } from './cart-item.entity';
import { CartItemList } from './cart-item.list';
import { CartTag } from './cart-tag.entity';
import { CartTagList } from './cart-tag.list';
import {
  CartCleared,
  CartItemAdded,
  CartItemQtyChanged,
  CartItemRemoved,
} from './events';
import { SalesFactor } from './sales-factor.vo';
import { SalesItemModel } from './sales-item.model';
import { Tag } from './tag.vo';

export type CartRequiredProps = {
  buyerId: BuyerId;
  type: CartType;
  deliveryAddressId: Nullable<EntityId<string>>;
};

type CartOptionalProps = Partial<{
  items: CartItemList;
  tags: CartTagList;
  updatedAt: Date;
}>;

export type CartProps = CartRequiredProps & CartOptionalProps;

export class CartAggregate extends AggregateRoot<Required<CartProps>, string> {
  private constructor(
    props: CartRequiredProps & CartOptionalProps,
    id?: string,
  ) {
    super(
      {
        ...props,
        items: props.items || new CartItemList(),
        tags: props.tags || new CartTagList(),
        updatedAt: props.updatedAt || new Date(),
      },
      id ? EntityId.fromString(id) : undefined,
    );

    this.summarizeCartTag();
  }

  get type() {
    return this.props.type;
  }

  get items() {
    return this.props.items;
  }

  get tags() {
    return this._props.tags.toReadonly();
  }

  public static create(props: CartRequiredProps) {
    return new CartAggregate(props, undefined);
  }

  public static reconstitute(props: CartProps, id: string) {
    return new CartAggregate(props, id);
  }

  public putItem(
    identity: UserIdentity,
    item: SalesItemModel,
    baseQty: Quantity,
    packQty: Quantity,
    addQuantity = false,
  ): void {
    // this.logger.debug({ item, qty }, `putting item into cart`);
    const isPackSellable = item.pack !== null;
    const zero = Quantity.zero();

    if (packQty.gt(zero) && !isPackSellable) {
      throw new CartException.PackNotSellable();
    }

    const itemHasPrice = item.price.gt(Money.zero());
    if (!itemHasPrice) throw new CartException.ItemPriceNotAvailable();

    const existing = this.findItem(item.id.value);
    // resolve quantity to a single number
    let qty = Quantity.create(baseQty.value * item.base.contains.value).add(
      item.pack
        ? Quantity.create(packQty.value * item.pack.contains.value)
        : zero,
    );
    if (existing && addQuantity) {
      qty = qty.add(existing.qty);
    }

    const factorValue = MathUtil.lcm([
      item.base.contains.value,
      item.factor.value,
    ]);
    const salesFactor = SalesFactor.create(factorValue);
    const isBaseSellable =
      item.pack && item.pack.contains.value !== 1
        ? salesFactor.value % item.pack.contains.value != 0
        : true;

    if (!(qty.value % factorValue === 0))
      throw new CartException.QuantityMustBeAFactorOf(
        salesFactor.value,
        qty.value,
      );

    const qtyIntermediate = SalesUtil.getQtyInIntermediate(
      qty,
      item.base.contains,
    );
    const qtyPack = SalesUtil.getQtyInPack(qty, item.pack?.contains);

    if (existing) {
      // this.logger.debug(
      //   `found existing item with id ${item.id.value}, updating qty...`,
      // );

      existing.updateQty(qty, qtyIntermediate, qtyPack);
      existing.updateSalesFactor(salesFactor);
      existing.updateUomSellable(isBaseSellable, isPackSellable);

      if (existing.isDirty) {
        this.raise(
          new CartItemQtyChanged({
            cartId: this.id.value,
            cartItemId: existing.id.value,
            identity: identity,
            itemId: item.id.value,
            qty: qty.value,
          }),
        );
      }
    } else {
      // this.logger.debug(
      //   `no item found with id ${item.id.value}, creating a new cart item entry`,
      // );
      const cartItem = CartItem.create({
        itemId: item.id,
        qty,
        qtyIntermediate,
        qtyPack,
        salesFactor,
        tags: item.tags,
        isBaseSellable,
        isPackSellable,
        addedAt: new Date(),
      });
      this.props.items.add(cartItem);

      this.raise(
        new CartItemAdded({
          cartId: this.id.value,
          cartItemId: cartItem.id.value,
          identity,
          itemId: item.id.value,
          qty: qty.value,
        }),
      );
    }

    this.updateUpdatedAt();
    this.summarizeCartTag();
  }

  public clear(identity: UserIdentity): void {
    this.props.items.clear();
    this.props.tags.clear();
    this.updateUpdatedAt();
    this.raise(
      new CartCleared({
        cartId: this.id.value,
        identity,
      }),
    );
  }

  private summarizeCartTag() {
    this._props.tags.reset();

    for (const item of this.items.getItems()) {
      for (const tag of item.tags.filter((tag) =>
        TagKeys.some((validKey) => tag.key.startsWith(validKey)),
      )) {
        const existing = this.props.tags
          .getItems()
          .find((x) => x.tag.equals(tag));
        if (!existing) {
          const cartTag = CartTag.create({
            tag: tag.toString(),
            qty: item.qty.value,
          });

          this._props.tags.add(cartTag);
        } else {
          const qty = item.qty.add(existing.qty);
          existing.updateQty(qty.value);
        }
      }
    }

    // remove any tag with qty 0
    this.props.tags
      .getItems()
      .filter((x) => x.qty.equals(Quantity.zero()))
      .map((x) => this.props.tags.remove(x));
  }

  private findItem(itemId: string): CartItem | undefined {
    return this.props.items.currentItems.find((item) =>
      item.itemId.equals(EntityId.fromString(itemId)),
    );
  }

  public removeItem(identity: UserIdentity, itemId: string): void {
    // this.logger.debug(`removing item with id ${itemId}`);
    const existing = this.findItem(itemId);
    if (existing) {
      this.props.items.remove(existing);
      this.raise(
        new CartItemRemoved({
          identity,
          cartId: this.id.value,
          cartItemId: existing.id.value,
          itemId: itemId,
        }),
      );

      this.updateUpdatedAt();
      this.summarizeCartTag();
    }
  }

  public updateAddress(deliveryAddressId: string): void {
    const newDeliveryAddressId = EntityId.fromString(deliveryAddressId);
    if (
      !this.props.deliveryAddressId ||
      !newDeliveryAddressId.equals(this.props.deliveryAddressId)
    ) {
      this.props.deliveryAddressId = newDeliveryAddressId;
      this.markDirty();
    }
  }

  public countTagItemCombination(tag: Tag): Quantity {
    return this.props.items.getItems().reduce((acc, item) => {
      if (
        item.tags.some((t) => t.equals(tag)) &&
        item.qty.gt(Quantity.zero())
      ) {
        return acc.add(Quantity.create(1));
      }
      return acc;
    }, Quantity.zero());
  }

  private updateUpdatedAt(): void {
    this.props.updatedAt = new Date();
    this.markDirty();
  }
}
