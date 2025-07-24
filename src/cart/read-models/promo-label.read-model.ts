import { CartItemReadModel, PromoLabelAllOfReadModel } from '.';

import { Nullable } from '@wings-corporation/core';
import { EntityId } from '@wings-corporation/domain';
import { UomType } from '@wings-online/app.constants';
import { BenefitType } from '@wings-online/common';

import { JsonFreeProductProps } from '../domains';
import { PromoLabelOneOfReadModel } from './promo-label-one-of.read-model';

type LabelPromoType = 'PKWO' | 'TPR_DIRECT' | 'TPR_STRATA';

export type Benefit = {
  type: BenefitType;
  value: number;
  uomType?: UomType;
};

export type PromoLabelReadModelProps = {
  id: EntityId<string>;
  applied: boolean;
  key: PromoLabelKey;
};

export type JsonPromoLabelProps =
  | JsonPKWOLabelProps
  | JsonTPRDirectLabelProps
  | JsonTPRStrataLabelProps;

export interface IJsonPromoLabel {
  applied: boolean;
  type: LabelPromoType;
  tag: Nullable<string>;
  tag_qty: Nullable<{
    base: number;
    item_combination: number;
    previous_qty: number;
  }>;
  tag_criteria: Nullable<JsonTagCriteria>;
}

interface JsonBenefitProps {
  type: BenefitType;
  value: number;
  uom_type?: UomType;
}

export interface JsonPKWOLabelProps extends IJsonPromoLabel {
  type: 'PKWO';
  external_id: string;
  base_offer: number;
  pack_offer: Nullable<number>;
  benefits: JsonBenefitProps[];
  coin_amount: number;
}

export interface JsonTPRDirectLabelProps extends IJsonPromoLabel {
  type: 'TPR_DIRECT';
  priorities: number[];
  base_offer: number;
  pack_offer: Nullable<number>;
  benefits: JsonBenefitProps[];

  max_qty: Nullable<number>;
  max_uom_type: Nullable<UomType>;

  coin_amount: number;

  // used for free products
  benefit_qty: number;
  benefit_uom_type: Nullable<UomType>;
  free_product: Nullable<JsonFreeProductProps>;
  scale_qty: Nullable<number>;
  scale_uom_type: Nullable<UomType>;
}

export interface JsonTPRStrataLabelProps extends IJsonPromoLabel {
  type: 'TPR_STRATA';
  criteria: JsonPromoStrataCriteriaProps[];
}

type JsonPromoStrataCriteriaProps = {
  applied: boolean;
  priorities: number[];
  min_qty?: number;
  min_uom_type?: UomType;
  min_purchase?: number;
  benefits: Array<JsonBenefitProps>;
  base_offer: number;
  pack_offer: Nullable<number>;
  coin_amount: number;
};

export type JsonTagCriteria = {
  min_qty: number;
  min_qty_uom_type: UomType;
  min_item_combination: number;
  item_min_qty: number;
  item_min_qty_uom_type: UomType;
  item_has_matching_tag: boolean;
  included_tag: Nullable<string>;
  included_tag_min_qty: number;
  included_tag_min_qty_uom_type: UomType;
  included_tag_qty: number;
  included_tag_qty_previous: number;
  is_ratio_based: boolean;
  items: {
    id: string;
    qty: number;
  }[];
};

export type PromoLabelKey = {
  id?: EntityId<string>;
  item: CartItemReadModel;
  itemPrice: number;
  coinPrice: number;
  tag?: string;
  type: LabelPromoType;
  benefitUomType?: UomType;
};

export type PromoLabelReadModel =
  | PromoLabelAllOfReadModel
  | PromoLabelOneOfReadModel;
