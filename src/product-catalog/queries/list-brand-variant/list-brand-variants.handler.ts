import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Quantity } from '@wings-corporation/domain';
import { UserIdentity } from '@wings-online/common';
import { IProductReadRepository } from '@wings-online/product-catalog/interfaces';
import { PRODUCT_READ_REPOSITORY } from '@wings-online/product-catalog/product-catalog.constants';
import {
  IPromoReadRepository,
  PROMO_READ_REPOSITORY,
} from '@wings-online/product-catalog/promotion';
import { VariantReadModel } from '@wings-online/product-catalog/read-models';

import { ListBrandVariantsQuery } from './list-brand-variants.query';
import { ListBrandVariantsResult } from './list-brand-variants.result';

@QueryHandler(ListBrandVariantsQuery)
export class ListBrandVariantsHandler
  implements IQueryHandler<ListBrandVariantsQuery, ListBrandVariantsResult>
{
  constructor(
    @InjectPinoLogger(ListBrandVariantsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly repository: IProductReadRepository,
    @Inject(PROMO_READ_REPOSITORY)
    private readonly promoRepository: IPromoReadRepository,
  ) {}

  async execute(
    query: ListBrandVariantsQuery,
  ): Promise<ListBrandVariantsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const data = await this.repository.getBrandVariants({
      ...query,
    });

    await this.resolveVariantsCartQty(query.identity, data);

    if (query.activeItemId) {
      const tags = (
        await this.repository.findProductTags(
          query.activeItemId,
          query.identity,
        )
      )?.map((tag) => tag.toString());

      if (tags.length) {
        const promotions = (
          await Promise.all([
            this.promoRepository.listProductsRegularPromotions(
              query.identity,
              [],
              tags,
            ),
            this.promoRepository.listProductsPromotions(
              query.identity,
              [],
              tags,
            ),
          ])
        ).flat();

        for (const variant of data) {
          variant.setHasCombinablePromo(
            promotions.some(
              (promotion) =>
                promotion.target.tag !== '*' &&
                variant.props.tags.some((tag) => tag === promotion.target.tag),
            ),
          );
        }
      }
    }

    // Log memory usage in megabytes and bytes
    const memoryUsage = process.memoryUsage();
    this.logger.info(
      {
        memoryUsage: {
          rss: {
            bytes: memoryUsage.rss,
            megabytes: (memoryUsage.rss / (1024 * 1024)).toFixed(2),
          },
          heapTotal: {
            bytes: memoryUsage.heapTotal,
            megabytes: (memoryUsage.heapTotal / (1024 * 1024)).toFixed(2),
          },
          heapUsed: {
            bytes: memoryUsage.heapUsed,
            megabytes: (memoryUsage.heapUsed / (1024 * 1024)).toFixed(2),
          },
          external: {
            bytes: memoryUsage.external,
            megabytes: (memoryUsage.external / (1024 * 1024)).toFixed(2),
          },
          arrayBuffers: {
            bytes: memoryUsage.arrayBuffers,
            megabytes: (memoryUsage.arrayBuffers / (1024 * 1024)).toFixed(2),
          },
        },
      },
      'After Memory Usage',
    );
    this.logger.trace(`END`);

    return new ListBrandVariantsResult(data);
  }

  private async resolveVariantsCartQty(
    identity: UserIdentity,
    variants: VariantReadModel[],
  ) {
    const cart = await this.repository.getItemQtyInCart(
      identity,
      variants.map((x) => x.props.itemId.value),
    );

    variants.forEach((variant) =>
      variant.setCartQty(
        cart.find((x) => x.itemId === variant.props.itemId.value)?.qty ||
          Quantity.zero(),
      ),
    );
  }
}
