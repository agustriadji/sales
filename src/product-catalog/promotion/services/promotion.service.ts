import { uniq } from 'lodash';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject, Injectable } from '@nestjs/common';
import { UserIdentity } from '@wings-online/common';
import { IBrandReadRepository } from '@wings-online/product-catalog/interfaces';
import { BRAND_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';

import { FlashSaleReadModel, PromotionReadModel } from '../../read-models';
import { IPromoReadRepository } from '../interfaces';
import {
  ApplyProductPromotionsParams,
  IPromotionService,
} from '../interfaces/promotion.service.interface';
import { PROMO_READ_REPOSITORY } from '../promotion.constants';

@Injectable()
export class PromotionService implements IPromotionService {
  constructor(
    @InjectPinoLogger(PromotionService.name)
    private readonly logger: PinoLogger,
    @Inject(PROMO_READ_REPOSITORY)
    private readonly promoRepository: IPromoReadRepository,
    @Inject(BRAND_READ_REPOSITORY)
    private readonly brandRepository: IBrandReadRepository,
  ) {}
  async applyProductPromotions(
    params: ApplyProductPromotionsParams,
  ): Promise<void> {
    const methodName = 'applyProductPromotions';
    this.logger.trace({ methodName, params }, 'begin');

    const { identity, products } = params;

    const tags = uniq(
      products
        .map((product) => product.tags)
        .flat()
        .map((tag) => tag.toString()),
    );

    // TODO: move this to product query
    const [regularPromotions] = await Promise.all([
      this.promoRepository.listProductsRegularPromotions(
        identity,
        products.map((product) => product.id),
        tags,
      ),
    ]);

    for (const product of products) {
      const productTags = product.tags.map((tag) => tag.toString());

      regularPromotions
        .filter(
          (promotion) =>
            promotion.target.itemId === product.id ||
            productTags.includes(promotion.target.tag.toString()),
        )
        .forEach((promotion) => product.promotion.addPromotion(promotion));

      product.applyPromotion(product.promotion);
    }

    await this.setPromoBrands(
      products.flatMap((x) => x.promotion.promotions),
      identity,
    );

    this.logger.trace({ methodName }, 'end');
  }

  async applyFlashSale(params: ApplyProductPromotionsParams): Promise<void> {
    const { identity, products } = params;
    const promos = await this.promoRepository.getFlashSaleItems({
      identity,
      itemIds: products.map((c) => c.id),
    });
    const promoMap = promos.reduce<Record<string, FlashSaleReadModel>>(
      (acc, promo) => {
        if (promo.target.type === 'TAG') {
          const items = products.filter((p) => {
            return p.tags.some((t) => promo.target.value === t.toString());
          });
          for (const item of items) {
            acc[item.id] = promo;
          }
        } else {
          acc[promo.target.value] = promo;
        }
        return acc;
      },
      {},
    );

    for (const product of products) {
      const promo = promoMap[product.id];
      if (promo) product.applyFlashSale(promo);
    }
  }

  private async setPromoBrands(
    promotions: PromotionReadModel[],
    identity: UserIdentity,
  ) {
    const tagPromotions = promotions.filter((x) => x.target.tag !== '*');
    const tags = uniq(
      tagPromotions.flatMap((x) =>
        [x.target.tag, x.tagCriteria?.includedTag?.toString()].filter(Boolean),
      ),
    ) as string[];

    const tagToBrands = await this.brandRepository.getTagBrands(tags, identity);

    promotions.forEach((x) => {
      const tagBrands = tagToBrands.get(x.target.tag);
      if (tagBrands) {
        x.setBrands(Array.from(tagBrands));
      }

      const includedTag = x.tagCriteria?.includedTag?.toString();
      if (includedTag) {
        const includedTagBrands = tagToBrands.get(includedTag);
        if (includedTagBrands) {
          x.setIncludedTagBrands(Array.from(includedTagBrands));
        }
      }
    });
  }
}
