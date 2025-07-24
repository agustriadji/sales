import { Collection, PaginatedCollection } from '@wings-corporation/core';
import { Tag } from '@wings-online/cart/domains';
import { UserIdentity } from '@wings-online/common';

import { FlashSaleStatus } from '../promotion';
import {
  ProductReadModel,
  VariantReadModel,
  VoucherReadModel,
} from '../read-models';
import { CartItemReadModel } from '../read-models/cart-item.read-model';
import { CartTagReadModel } from '../read-models/cart-tag.read-model';
import { ProductFilterCondition } from './product-filter.interface';
import { ProductSortCondition } from './product-sort.interface';

export type GetListProductsParams = {
  identity: UserIdentity;
  page?: number;
  pageSize?: number;
  filter?: ProductFilterCondition;
  sort?: ProductSortCondition;
  excludeInsideCart?: boolean;
  withoutPromoTpr?: boolean;
};

export type GetBestSellerProductsParams = {
  identity: UserIdentity;
  limit: number;
  cursor?: string;
  categoryId?: string;
};

export type GetBrandVariantsParams = {
  id: number;
  identity: UserIdentity;
};

export type GetCategoryProductsParams = {
  identity: UserIdentity;
  categoryId: string;
  page?: number;
  pageSize?: number;
  filter?: ProductFilterCondition;
  sort?: ProductSortCondition;
};

export type ListFlashSalesProductsParams = GetListProductsParams & {
  status?: FlashSaleStatus;
};

export interface IProductReadRepository {
  /**
   *
   * @param identity
   * @param id
   */
  getProductInfo(
    identity: UserIdentity,
    id: string,
  ): Promise<ProductReadModel | undefined>;

  /**
   *
   * @param identity
   * @param externalId
   */
  getProductIdByExternalId(
    identity: UserIdentity,
    externalId: string,
  ): Promise<string | undefined>;

  /**
   *
   * @param params
   */
  getNewProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;

  /**
   *
   * @param params
   */
  getBestSellerProducts(
    params: GetBestSellerProductsParams,
  ): Promise<Collection<ProductReadModel>>;

  /**
   *
   * @param params
   */
  getSelectedProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;

  /**
   *
   * @param params
   */
  getFrequentlyPurchasedProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;

  /**
   *
   * @param params
   */
  getSimilarProducts(
    params: GetListProductsParams & Partial<{ categoryId: number }>,
  ): Promise<PaginatedCollection<ProductReadModel>>;

  /**
   *
   * @param identity
   * @param barcode
   */
  getProductInfoByBarcode(
    identity: UserIdentity,
    barcode: string,
  ): Promise<ProductReadModel | undefined>;

  /**
   *
   * @param params
   */
  getBrandVariants(params: GetBrandVariantsParams): Promise<VariantReadModel[]>;

  /**
   *
   * @param params
   */
  getCategoryProducts(
    params: GetCategoryProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;

  /**
   *
   * @param barcode
   */
  isProductExistsByBarcode(barcode: string): Promise<boolean>;

  /**
   *
   * @param params
   */
  listProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;

  listFlashSaleProducts(
    params: ListFlashSalesProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;
  /**
   *
   * @param identity
   * @param productId
   */
  listProductVouchers(
    identity: UserIdentity,
    productId: string,
  ): Promise<VoucherReadModel[]>;

  /**
   *
   * @param params
   */
  listTPRProducts(
    params: GetListProductsParams,
  ): Promise<PaginatedCollection<ProductReadModel>>;

  /**
   *
   * @param identity
   * @param tags
   */

  getTagQtyInCart(
    identity: UserIdentity,
    tags: Tag[],
  ): Promise<CartTagReadModel[]>;

  /**
   *
   * @param identity
   * @param itemIds
   */
  getItemQtyInCart(
    identity: UserIdentity,
    itemIds: string[],
  ): Promise<CartItemReadModel[]>;

  /**
   *
   * @param productId
   * @param identity
   */
  findProductTags(productId: string, identity: UserIdentity): Promise<Tag[]>;
}
