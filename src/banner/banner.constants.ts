export const BANNER_READ_REPOSITORY = 'BANNER_READ_REPOSITORY';
export const BANNER_WRITE_REPOSITORY = 'BANNER_WRITE_REPOSITORY';
export const VIDEO_READ_REPOSITORY = 'VIDEO_READ_REPOSITORY';
export const SLIDE_READ_REPOSITORY = 'SLIDE_READ_REPOSITORY';

export enum BannerPage {
  PRODUCT_DETAIL = 'Product Detail',
  BRAND = 'Brand',
  CATEGORY = 'Category',
  PROMO = 'Promo',
  RECOMMENDATION = 'Rekomendasi',
  SKU_ORDER = 'SKU Order',
  FAVORITE = 'Favorit',
  NEW_PRODUCT = 'Produk Baru',
  HOME = 'Home',
  PROMO_PRODUCT = 'Promo Produk',
  MISSION_DISPLAY = 'Mission Display',
  MISSION_SURVEY = 'Mission Survey',
  MISSION_PURCHASE = 'Mission Purchase',
}

export enum BannerPageType {
  GENERAL = 'GENERAL',
  BRAND = 'BRAND',
  CATEGORY = 'CATEGORY',
}

export const DEFAULT_SUGGESTION_BANNER_RESHOW_DAYS = 30;

export const MAX_CACHE_TTL_MS = 1000 * 60 * 60 * 1; // 1 hour
