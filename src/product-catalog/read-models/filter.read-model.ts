import { Percentage } from '@wings-corporation/domain';
import { ReadModel } from '@wings-online/common';

import {
  PACK_SIZE_UNIT_ORDER,
  PackSizeUnit,
  ProductLabel,
} from '../product-catalog.constants';

type Brand = {
  id: number;
  name: string;
};

export type HETRange = {
  from: number;
  to?: number;
  label: string;
};

export type HETParameter = {
  range: HETRange[];
  percentage: Percentage;
};

export type PackSize = {
  value: number;
  unit: PackSizeUnit;
  label: string;
};

type FilterReadModelProps = {
  brand: Brand[];
  variant: string[];
  hetRange: HETRange[];
  size: PackSize[];
  label: ProductLabel[];

  hetParameter: HETParameter;
};

type JsonFilterProps = {
  brand: Brand[];
  variant: string[];
  het: HETRange[];
  size: string[];
  label: ProductLabel[];
};

export class FilterReadModel extends ReadModel {
  constructor(private readonly props: FilterReadModelProps) {
    super();
  }

  static empty(): FilterReadModel {
    return new FilterReadModel({
      brand: [],
      variant: [],
      hetRange: [],
      size: [],
      label: [],
      hetParameter: {
        range: [],
        percentage: Percentage.zero(),
      },
    });
  }

  addBrand(brand: Brand): void {
    if (!this.props.brand.some((x) => x.id === brand.id)) {
      this.props.brand.push(brand);
    }
  }

  addVariant(variant: string): void {
    if (!this.props.variant.includes(variant)) {
      this.props.variant.push(variant);
    }
  }

  addHetRange(hetRange: HETRange): void {
    if (!this.props.hetRange.some((x) => x.from === hetRange.from)) {
      this.props.hetRange.push(hetRange);
    }
  }

  addSize(size: PackSize): void {
    if (!this.props.size.some((x) => x.label === size.label)) {
      this.props.size.push(size);
    }
  }

  addLabel(label: ProductLabel): void {
    if (!this.props.label.includes(label)) {
      this.props.label.push(label);
    }
  }

  get brand(): Brand[] {
    return this.props.brand;
  }

  get variant(): string[] {
    return this.props.variant;
  }

  get hetRange(): HETRange[] {
    return this.props.hetRange.sort((a, b) => a.from - b.from);
  }

  get size(): string[] {
    return this.props.size
      .sort((a, b) => {
        if (a.unit.toLowerCase() === b.unit.toLowerCase()) {
          return a.value - b.value;
        }
        return (
          PACK_SIZE_UNIT_ORDER[a.unit.toLowerCase()] -
          PACK_SIZE_UNIT_ORDER[b.unit.toLowerCase()]
        );
      })
      .map((x) => x.label);
  }

  get label(): ProductLabel[] {
    return this.props.label;
  }

  toJSON(): JsonFilterProps {
    return {
      brand: this.brand,
      variant: this.variant,
      het: this.hetRange,
      size: this.size,
      label: this.label,
    };
  }
}
