import { Entity, EntityId, Quantity } from '@wings-corporation/domain';

import { SalesFactor } from './sales-factor.vo';
import { Tag } from './tag.vo';

export type CartItemProps = {
  itemId: EntityId<string>;
  qty: Quantity;
  qtyIntermediate: Quantity;
  qtyPack: Quantity;
  salesFactor: SalesFactor;
  tags: Tag[];

  isBaseSellable: boolean;
  isPackSellable: boolean;
  addedAt: Date;
};

export class CartItem extends Entity<CartItemProps, string> {
  private constructor(props: CartItemProps, id?: string) {
    super(props, id ? EntityId.fromString(id) : undefined);
  }

  public static create(props: CartItemProps, id?: string) {
    return new CartItem(props, id);
  }

  get itemId(): EntityId<string> {
    return this._props.itemId;
  }

  get tags(): Tag[] {
    return this.props.tags;
  }

  get qty(): Quantity {
    return this._props.qty;
  }

  get qtyIntermediate(): Quantity {
    return this._props.qtyIntermediate;
  }

  get qtyPack(): Quantity {
    return this._props.qtyPack;
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

  get addedAt(): Date {
    return this._props.addedAt;
  }

  updateQty(qty: Quantity, qtyIntermediate: Quantity, qtyPack: Quantity) {
    if (
      !qty.equals(this._props.qty) ||
      !qtyIntermediate.equals(this._props.qtyIntermediate) ||
      !qtyPack.equals(this._props.qtyPack)
    ) {
      this._props.qty = qty;
      this._props.qtyIntermediate = qtyIntermediate;
      this._props.qtyPack = qtyPack;
      this.markDirty();
    }
  }

  updateSalesFactor(salesFactor: SalesFactor) {
    if (!salesFactor.equals(this._props.salesFactor)) {
      this._props.salesFactor = salesFactor;
      this.markDirty();
    }
  }

  updateUomSellable(isBaseSellable: boolean, isPackSellable: boolean) {
    if (
      isBaseSellable !== this._props.isBaseSellable ||
      isPackSellable !== this._props.isPackSellable
    ) {
      this._props.isBaseSellable = isBaseSellable;
      this._props.isPackSellable = isPackSellable;
      this.markDirty();
    }
  }
}
