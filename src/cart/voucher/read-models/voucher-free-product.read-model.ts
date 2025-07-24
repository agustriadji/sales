import { Nullable } from '@wings-corporation/core';
import { Quantity } from '@wings-corporation/domain';
import { ItemUom } from '@wings-online/cart/domains';
import { ReadModel } from '@wings-online/common';

export interface FreeProductReadModelProps {
  id: string;
  externalId: string;
  name: Nullable<string>;
  imageUrl: Nullable<string>;
  qty: Quantity;
  uoms: {
    base: ItemUom;
    intermediate: Nullable<ItemUom>;
    pack: Nullable<ItemUom>;
  };
  appliedVoucher?: boolean;
}

type Benefit = {
  qty: number;
  uom: string;
};

export type JsonProductProps = {
  id: string;
  name: Nullable<string>;
  image_url: Nullable<string>;
  benefits: Benefit[];
  applied_voucher: boolean;
};

export class FreeProductReadModel extends ReadModel {
  constructor(private readonly props: FreeProductReadModelProps) {
    super();
  }

  get id(): string {
    return this.props.id;
  }

  get externalId(): string {
    return this.props.externalId;
  }

  get name(): Nullable<string> {
    return this.props.name;
  }

  get uoms(): {
    base: ItemUom;
    intermediate: Nullable<ItemUom>;
    pack: Nullable<ItemUom>;
  } {
    return this.props.uoms;
  }

  get qty(): Quantity {
    return this.props.qty;
  }

  get appliedVoucher(): boolean {
    return this.props.appliedVoucher || false;
  }

  applyVoucher(): void {
    this.props.appliedVoucher = true;
  }

  addQty(qty: Quantity) {
    this.props.qty = this.qty.add(qty);
  }

  toJSON(): JsonProductProps {
    const benefits: Benefit[] = [];
    let qty = this.qty.value;

    const addBenefit = (unit: Nullable<ItemUom>) => {
      if (!unit) return;

      const unitQty = Math.floor(qty / unit.contains.value);
      if (unitQty > 0) {
        benefits.push({ qty: unitQty, uom: unit.uom });
        qty -= unitQty * unit.contains.value;
      }
    };

    addBenefit(this.uoms.pack);
    addBenefit(this.uoms.intermediate);

    if (qty > 0) {
      benefits.push({
        qty: qty,
        uom: this.uoms.base.uom,
      });
    }

    return {
      id: this.props.id,
      name: this.props.name,
      image_url: this.props.imageUrl,
      applied_voucher: this.appliedVoucher,
      benefits,
    };
  }
}
