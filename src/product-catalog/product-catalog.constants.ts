export const PRODUCT_VIEWS_READ_REPOSITORY = 'PRODUCT_VIEWS_READ_REPOSITORY';
export const PRODUCT_VIEWS_WRITE_REPOSITORY = 'PRODUCT_VIEWS_WRITE_REPOSITORY';
export const CATEGORY_READ_REPOSITORY = 'CATEGORY_READ_REPOSITORY';
export const BRAND_READ_REPOSITORY = 'BRAND_READ_REPOSITORY';
export const BRAND_SEARCH_READ_REPOSITORY = 'BRAND_SEARCH_READ_REPOSITORY';
export const PRODUCT_SEARCH_READ_REPOSITORY = 'PRODUCT_SEARCH_READ_REPOSITORY';
export const CATEGORY_PARENT_READ_REPOSITORY =
  'CATEGORY_PARENT_READ_REPOSITORY';
export const CATEGORY_SEQUENCE_READ_REPOSITORY =
  'CATEGORY_SEQUENCE_READ_REPOSITORY';

export const PRODUCT_CATALOG_SERVICE = 'PRODUCT_CATALOG_SERVICE';
export const MAX_PRODUCT_VIEW_LENGTH = 5;

export const PRODUCT_READ_REPOSITORY = 'PRODUCT_READ_REPOSITORY';

export const FILTER_READ_REPOSITORY = 'FILTER_READ_REPOSITORY';

export const PRODUCT_HELPER_REPOSITORY = 'PRODUCT_HELPER_REPOSITORY';

export enum PackSizeUnit {
  GRAM = 'gr',
  KILOGRAM = 'kg',
  MILI_LITER = 'ml',
  LITER = 'l',
}

export enum ProductType {
  DRY = 'DRY',
  FROZEN = 'FROZEN',
}

export enum ProductEntity {
  WS = 'WS',
  SMU = 'SMU',
  WGO = 'WGO',
}

export enum CategoryTypes {
  DRY = 'DRY',
  FROZEN = 'FROZEN',
}

export const PACK_SIZE_UNIT_ORDER: Record<PackSizeUnit, number> = {
  gr: 1,
  kg: 2,
  ml: 3,
  l: 4,
};

export enum ProductLabel {
  RECOMMENDED = 'Rekomendasi',
  FLASH_SALE = 'Promo Flash Sale',
  APP_PROMOTION = 'Promo Aplikasi',
  LOW_STOCK = 'Stok Anda Hampir Habis',
  BEST_SELLER = 'Terbaik',
}

export enum RecommendationFilter {
  SELECTED = 'SELECTED',
  FREQUENTLY_PURCHASED = 'FREQUENTLY_PURCHASED',
  SIMILAR = 'SIMILAR',
  ANY = 'ANY',
}

export const PRODUCT_DEFAULT_BASE_UOM = 'PCS';
export const PRODUCT_DEFAULT_PACK_UOM = 'BOX';

export enum RecommendationType {
  SELECTED = 'selected',
  FREQUENTLY_PURCHASED = 'frequently_purchased',
  SIMILAR = 'similar',
}

export const MAX_CACHE_TTL_MS = 1000 * 60 * 60 * 1; // 1 hour
