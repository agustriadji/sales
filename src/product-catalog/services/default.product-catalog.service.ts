import { union, uniq } from 'lodash';

import { Inject, Injectable } from '@nestjs/common';
import { Quantity } from '@wings-corporation/domain';
import { Tag } from '@wings-online/cart/domains';
import { UserIdentity } from '@wings-online/common';

import { IProductReadRepository } from '../interfaces';
import { IProductCatalogService } from '../interfaces/product-catalog.service.interface';
import { PRODUCT_READ_REPOSITORY } from '../product-catalog.constants';
import { PROMOTION_SERVICE } from '../promotion';
import { IPromotionService } from '../promotion/interfaces/promotion.service.interface';
import { ProductReadModel } from '../read-models';
import { CartItemReadModel } from '../read-models/cart-item.read-model';

@Injectable()
export class DefaultProductCatalogService implements IProductCatalogService {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly productRepository: IProductReadRepository,
    @Inject(PROMOTION_SERVICE)
    private readonly promotionService: IPromotionService,
  ) {}

  /**
   *
   * @param identity
   * @param id
   * @returns
   */
  async getProductInfo(
    identity: UserIdentity,
    id: string,
  ): Promise<ProductReadModel | undefined> {
    const product = await this.productRepository.getProductInfo(identity, id);
    if (product) {
      await Promise.resolve([
        this.promotionService.applyProductPromotions({
          identity,
          products: [product],
        }),
        this.promotionService.applyFlashSale({
          identity: identity,
          products: [product],
        }),
      ]);

      await this.resolveCartQty(identity, [product]);
    }
    return product;
  }

  async resolveCartQty(identity: UserIdentity, products: ProductReadModel[]) {
    const productIds = products.map((p) => p.id);

    const promoProductIds = products.flatMap((product) =>
      product.promotion.promotions.flatMap(
        (promotion) =>
          promotion.tagCriteria?.items?.map((item) => item.id) || [],
      ),
    );

    const [productCartQty, _] = await Promise.all([
      this.productRepository.getItemQtyInCart(
        identity,
        productIds.concat(promoProductIds),
      ),
      this.resolvePromoTagsQtyInCart(identity, products),
    ]);

    const productCartQtyMap = new Map(
      productCartQty.map((qty) => [qty.itemId, qty]),
    );

    this.resolveProductsCartQty(products, productCartQtyMap);
    this.resolvePromoProductsCartQty(products, productCartQtyMap);
  }

  async resolvePromotions(
    identity: UserIdentity,
    products: ProductReadModel[],
    isSkipFlashSale?: boolean,
  ): Promise<void> {
    const promotionTasks = [
      // resolve promotion informations
      this.promotionService.applyProductPromotions({
        identity,
        products,
      }),
    ];

    if (!isSkipFlashSale) {
      // resolve flash sale informations
      promotionTasks.push(
        this.promotionService.applyFlashSale({
          identity: identity,
          products,
        }),
      );
    }

    await Promise.all(promotionTasks);
  }

  private resolveProductsCartQty(
    products: ProductReadModel[],
    cartQtyMap: Map<string, CartItemReadModel>,
  ) {
    products.map((p) => {
      const cartItem = cartQtyMap.get(p.id);
      p.setCartQty(cartItem?.qty || Quantity.zero());
      cartItem?.addedAt && p.setAddedToCartAt(cartItem.addedAt);
    });
  }

  private resolvePromoProductsCartQty(
    products: ProductReadModel[],
    productCartQtyMap: Map<string, CartItemReadModel>,
  ) {
    products.forEach((product) => {
      product.promotion.promotions.forEach((promotion) => {
        promotion.tagCriteria?.items?.forEach((item) => {
          const qty = productCartQtyMap.get(item.id);
          if (qty) {
            product.qtyInCart.addQtyByItem({
              itemId: item.id,
              qty: qty.qty,
              addedAt: qty.addedAt,
            });
          }
        });
      });
    });
  }

  private async resolvePromoTagsQtyInCart(
    identity: UserIdentity,
    products: ProductReadModel[],
  ) {
    const tags = uniq(
      products.flatMap((product) =>
        union(
          product.promotion.promotions.flatMap((promotion) => {
            const promotionTag =
              promotion.target.tag !== '*' ? [promotion.target.tag] : [];
            if (promotion.tagCriteria?.includedTag) {
              promotionTag.push(promotion.tagCriteria.includedTag.toString());
            }
            return promotionTag;
          }),
          product.flashSale?.promotion?.target.type === 'TAG'
            ? [product.flashSale.promotion.target.value]
            : [],
        ),
      ),
    );

    const tagsQtyInCart = await this.productRepository.getTagQtyInCart(
      identity,
      tags.map((tag) => Tag.fromString(tag)),
    );

    const tagQtyMap = new Map(
      tagsQtyInCart.map((qty) => [qty.tag.toString(), qty]),
    );

    products.forEach((product) => {
      product.promotion.promotions.forEach((promotion) => {
        if (promotion.target.tag !== '*') {
          const qty = tagQtyMap.get(promotion.target.tag);
          qty && product.qtyInCart.addQtyByTag(qty);
        }

        if (promotion.tagCriteria?.includedTag) {
          const qty = tagQtyMap.get(
            promotion.tagCriteria.includedTag.toString(),
          );
          qty && product.qtyInCart.addQtyByTag(qty);
        }
      });

      if (product.flashSale?.promotion?.target.type === 'TAG') {
        const qty = tagQtyMap.get(product.flashSale.promotion.target.value);
        qty && product.qtyInCart.addQtyByTag(qty);
      }
    });
  }
}
