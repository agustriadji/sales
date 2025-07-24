import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { ProductViewed } from '../domains/events';
import { IProductViewsWriteRepository } from '../interfaces';
import { PRODUCT_VIEWS_WRITE_REPOSITORY } from '../product-catalog.constants';

@EventsHandler(ProductViewed)
export class ProductViewedSubscriber implements IEventHandler<ProductViewed> {
  constructor(
    @InjectPinoLogger(ProductViewedSubscriber.name)
    private readonly logger: PinoLogger,
    @Inject(PRODUCT_VIEWS_WRITE_REPOSITORY)
    private readonly repository: IProductViewsWriteRepository,
  ) {}

  async handle(event: ProductViewed) {
    this.logger.info({ event });
    const views = await this.repository.find(event.data.identity);
    views.addView(event.data.productId.value);
    await this.repository.save(views);
  }
}
