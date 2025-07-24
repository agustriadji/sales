import { UomType } from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';

export type TagCriteria = {
  minItemCombination: number;
  items: {
    id: string;
    name?: string;
    uom?: {
      base: string;
      intermediate?: string;
      pack?: string;
    };
  }[];
  itemMinQty: number;
  itemMinUomType: UomType;
  includedTag?: Tag;
  includedTagBrands?: string[];
  includedTagMinQty: number;
  includedTagMinUomType: UomType;
  isItemHasMatchingTag: boolean;
  isRatioBased: boolean;
};
