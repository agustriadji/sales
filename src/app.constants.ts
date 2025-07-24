import { BenefitType } from './common';

export const CART_WRITE_REPOSITORY = 'CART_WRITE_REPOSITORY';
export const CART_READ_REPOSITORY = 'CART_READ_REPOSITORY';
export const BUYER_READ_REPOSITORY = 'BUYER_READ_REPOSITORY';
export const BUYER_WRITE_REPOSITORY = 'BUYER_WRITE_REPOSITORY';
export const CHECKOUT_WRITE_REPOSITORY = 'CHECKOUT_WRITE_REPOSITORY';
export const CART_VOUCHER_WRITE_REPOSITORY = 'CART_VOUCHER_WRITE_REPOSITORY';
export const ITEM_SALES_UOM_READ_REPOSITORY = 'ITEM_SALES_UOM_READ_REPOSITORY';
export const EVENT_WRITE_REPOSITORY = 'EVENT_WRITE_REPOSITORY';
export const SALES_ITEM_WRITE_REPOSITORY = 'SALES_ITEM_WRITE_REPOSITORY';
export const PROMO_CMS_REDEMPTION_WRITE_REPOSITORY =
  'PROMO_CMS_REDEMPTION_WRITE_REPOSITORY';
export const CONFIG_READ_REPOSITORY = 'CONFIG_READ_REPOSITORY';
export const LOCK_PROVIDER = 'LOCK_PROVIDER';

export const CART_SERVICE = 'CART_SERVICE';

export const HEALTH_CHECK_PATH = 'health';

export const JACK_POINT_TYPE = 'J';
export const QUEEN_POINT_TYPE = 'Q';
export const KING_POINT_TYPE = 'K';

export enum PromotionType {
  FLASH_SALE = 'FLS',
  TPR = 'TPR',
  WINGS_ONLINE = 'REG',
  LOYALTY = 'LYL',
}

export enum RecommendationType {
  UpSales = 'US',
  CrossSales = 'CS',
}

export enum PromoConditionType {
  AllOf = 'AllOf',
  OneOf = 'OneOf',
}

export type DiscountType = BenefitType;
export type CoinType = BenefitType;

export enum ConfigKey {
  POINT_CONVERSION_EXPRESSION = 'POINT_CONVERSION_EXPRESSION',
  POINT_INCREMENTS = 'POINT_INCREMENTS',
}

export const GlobalAdvisoryLockIdentifier = `cart`;
export const ServiceName = 'sales-api';
export const ServiceReversedFQDN = 'com.online.wings.sales.api';

export const EVENTBRIDGE_CLIENT_TOKEN = 'EVENTBRIDGE_CLIENT_TOKEN';
export const S3_CLIENT_TOKEN = 'S3_CLIENT_TOKEN';

export const ITEM_VOUCHER_MAX_PERCENTAGE = 80;

export const LEGACY_MATERIAL_PACK_UOM = ['BOX', 'CTN', 'PAC', 'PAK', 'KRG'];

export const TAG_KEY_MATERIAL_GROUP_2 = 'grp02';

export const RETAIL_S_GROUP = '63';

export const TIMEZONE = 'Asia/Jakarta';

export const LEGACY_ORDER_DEFAULT_TIMEZONE = 'Asia/Jakarta';

export enum KeyPrefix {
  SalesOrg = 'sls_org:',
  DistChannel = 'dist_chan:',
  SalesOffice = 'sls_ofc:',
  PriceListType = 'price_list_type:',
  CustGroup = 'grp:',
  CustomerHier = 'hier:',
  CustId = 'id:',
  SalesGroup = 'sls_grp:',
}

export type PromoTPRType = 'DIRECT' | 'STRATA';
export enum PromoTPRTypeEnum {
  DIRECT = 'DIRECT',
  STRATA = 'STRATA',
}

export type UomType = 'BASE' | 'PACK' | 'INTERMEDIATE';
export enum UomTypeEnum {
  BASE = 'BASE',
  PACK = 'PACK',
  INTERMEDIATE = 'INTERMEDIATE',
}

export enum ExternalDivisionType {
  DRY = '88',
  FROZEN = '77',
}

export type VoucherType = 'FREE_PRODUCT' | 'DISCOUNT';

export const enum LegacyVoucherStatusEnum {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export const enum LegacyVoucherTypeEnum {
  DISCOUNT = 'Discount',
  FREE_PRODUCT = 'Free Product',
}

export const enum LegacyCustomerRewardStatusEnum {
  NOT_USED = 'Not Used',
  USED = 'Used',
}

// TODO move this to @wings-corporation/types to be shared with lambda
export type TagKey =
  | MATERIAL_GROUP_1_TAG_KEY
  | MATERIAL_GROUP_2_TAG_KEY
  | MATERIAL_GROUP_3_TAG_KEY
  | MATERIAL_GROUP_4_TAG_KEY
  | MATERIAL_GROUP_5_TAG_KEY;

export const TagKeys = ['grp01', 'grp02', 'grp03', 'grp04', 'grp05'];

export type MATERIAL_GROUP_1_TAG_KEY = 'grp01';
export type MATERIAL_GROUP_2_TAG_KEY = 'grp02';
export type MATERIAL_GROUP_3_TAG_KEY = 'grp03';
export type MATERIAL_GROUP_4_TAG_KEY = 'grp04';
export type MATERIAL_GROUP_5_TAG_KEY = 'grp05';

export enum GeneralConfigGroupEnum {
  GeneralVoucher = 'general_voucher',
}

export enum GeneralConfigKeyEnum {
  GeneralVoucherFlagCombine = 'flag_combine',
}

export const EXCLUDE_CHECK_OVERDUE_TERM = 'Z00';

export const MAX_CACHE_TTL_SECONDS = 1 * 60 * 60; // 1 hour
export const SHORT_DEFAULT_TTL_SECONDS = 60; // 1 minute

export const enum FeatureFlagNameEnum {
  EnableAPICache = 'enable-api-cache',
}
