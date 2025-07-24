import { UomType } from '@wings-online/app.constants';
import {
  CoinBenefit,
  DiscountBenefit,
  MinimumPurchaseQtyByTagCriterion,
  MinimumPurchaseQtyCriterion,
} from '@wings-online/common';

type FlashSaleReadModelProps = {
  id: string;
  externalId: string;
  startAt: Date;
  endAt: Date;
  target: {
    type: 'TAG' | 'ITEM';
    value: string;
  };
  criteria: {
    id: string;
    criterion: MinimumPurchaseQtyCriterion | MinimumPurchaseQtyByTagCriterion;
    minQtyUomType: UomType;
  };
  benefit: {
    discount: DiscountBenefit;
    coin?: CoinBenefit;
    scaleQty: number;
    maxQty: number;
    maxQtyUomType: UomType;
    scaleQtyUomType: UomType;
  };
  redeemedQty: number;
};

export class FlashSaleReadModel {
  constructor(private readonly props: FlashSaleReadModelProps) {}

  get id() {
    return this.props.id;
  }

  get externalId() {
    return this.props.externalId;
  }

  get startAt() {
    return this.props.startAt;
  }

  get endAt() {
    return this.props.endAt;
  }

  get target() {
    return this.props.target;
  }

  get criteria() {
    return this.props.criteria;
  }

  get benefit() {
    return this.props.benefit;
  }

  get redeemedQty() {
    return this.props.redeemedQty;
  }
}
