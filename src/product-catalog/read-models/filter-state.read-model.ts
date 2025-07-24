import {
  Condition,
  FilterItemSource,
  Range,
} from '../interfaces/filter-state.interface';
import {
  PACK_SIZE_UNIT_ORDER,
  PackSizeUnit,
  ProductLabel,
} from '../product-catalog.constants';
import {
  FilterStateItem,
  JsonFilterStateItemProps,
} from './filter-state-item.read-model';

export class FilterState {
  private _brands: FilterStateItem[];
  private _variants: FilterStateItem[];
  private _sizes: FilterStateItem[];
  private _hets: FilterStateItem<Range>[];
  private _labels: FilterStateItem<ProductLabel>[];

  private _items: FilterItemSource[];

  constructor() {
    this._items = [];
    this._brands = [];
    this._variants = [];
    this._sizes = [];
    this._hets = [];
    this._labels = [];
  }

  addItemSource(item: FilterItemSource) {
    this._items.push(item);
    this.addBrand(item.brandId, item.brandDescription);
    this.addVariant(item.variant);
    this.addSize(item.size);
    item.label.map((label) => this.addLabel(label));
  }

  addCondition(condition: Condition) {
    for (const size of this.sizes) {
      size.addCondition(condition);
    }

    for (const brand of this.brands) {
      brand.addCondition(condition);
    }

    for (const variant of this.variants) {
      variant.addCondition(condition);
    }

    for (const het of this.hets) {
      het.addCondition(condition);
    }

    for (const label of this._labels) {
      label.addCondition(condition);
    }
  }

  private addBrand(id: string, description: string) {
    const existing = this._brands.find((x) => x.value === id);
    if (!existing) {
      const brand = new FilterStateItem(this, 'BRAND', id, description);
      this._brands.push(brand);
    }
  }

  private addVariant(value: string) {
    const existing = this._variants.find((x) => x.value === value);
    if (!existing) {
      const variant = new FilterStateItem(this, 'VARIANT', value);
      this._variants.push(variant);
    }
  }

  private addSize(value: string) {
    const existing = this._sizes.find((x) => x.value === value);
    if (!existing) {
      const size = new FilterStateItem(this, 'SIZE', value);
      this._sizes.push(size);
    }
  }

  public addHetRange(range: Range, label: string) {
    const het = new FilterStateItem(this, 'HET', range, label);
    this._hets.push(het);
  }

  public addLabel(value: ProductLabel) {
    const existing = this._labels.find((x) => x.value === value);
    if (!existing) {
      const label = new FilterStateItem(this, 'LABEL', value);
      this._labels.push(label);
    }
  }

  // public addHetRange(from: number, to: number) {
  //   const het = new FilterStateItem(this._items, 'HET', { from, to });
  //   this._hets.push(het)
  // }

  get items() {
    return this._items;
  }

  get brands() {
    return this._brands;
  }

  get variants() {
    return this._variants;
  }

  get sizes() {
    return this._sizes;
  }

  get hets() {
    return this._hets;
  }

  toJSON(): JsonFilterStateProps {
    return {
      brands: this.brands
        .sort((a, b) => {
          return a.label > b.label ? 1 : -1;
        })
        .map((x) => x.toJSON()),
      variants: this.variants
        .sort((a, b) => {
          return a.label > b.label ? 1 : -1;
        })
        .map((x) => x.toJSON()),
      sizes: this.sizes
        .sort((a, b) => {
          const aSize = this.parseSize(a.value as string);
          const bSize = this.parseSize(b.value as string);
          if (!aSize.unit || !aSize.value || !bSize.unit || !bSize.value) {
            return -1;
          }

          if (aSize.unit.toLowerCase() === bSize.unit.toLowerCase()) {
            return aSize.value - bSize.value;
          }
          return (
            PACK_SIZE_UNIT_ORDER[aSize.unit.toLowerCase()] -
            PACK_SIZE_UNIT_ORDER[bSize.unit.toLowerCase()]
          );
        })
        .map((x) => x.toJSON()),
      hets: this.hets
        .filter((het) => {
          return this.items.some((item) =>
            this.isWithinRange(het.value, item.het),
          );
        })
        .sort((a, b) => {
          if (a.value.from && b.value.from) {
            return a.value.from - b.value.from;
          } else if (a.value.to && b.value.to) {
            return a.value.to - b.value.to;
          }
          return 0;
        })
        .map((x) => x.toJSON()),
      labels: this._labels.sort((a, b) => {
        return a.label > b.label ? 1 : -1;
      }),
    };
  }

  private isWithinRange(range: Range, value: number): boolean {
    if (range.from && range.to) {
      return range.from <= value && range.to >= value;
    } else if (range.from) {
      return range.from <= value;
    } else if (range.to) {
      return range.to >= value;
    } else {
      return false;
    }
  }

  private parseSize(size: string) {
    const match = size.match(/^(\d+)\s*([a-zA-Z]+)$/);
    return {
      value: match ? parseInt(match[1], 10) : undefined,
      unit: match ? (match[2] as PackSizeUnit) : undefined,
    };
  }
}

export type JsonFilterStateProps = {
  brands: JsonFilterStateItemProps[];
  variants: JsonFilterStateItemProps[];
  sizes: JsonFilterStateItemProps[];
  hets: JsonFilterStateItemProps[];
  labels: JsonFilterStateItemProps[];
};
