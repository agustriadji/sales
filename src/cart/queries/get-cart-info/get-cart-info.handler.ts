import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CART_SERVICE } from '@wings-online/app.constants';
import { ICartService } from '@wings-online/cart/interfaces';
import { createBadRequestException } from '@wings-online/common';

import { GetCartInfoQuery } from './get-cart-info.query';
import { GetCartInfoResult } from './get-cart-info.result';

@QueryHandler(GetCartInfoQuery)
export class GetCartInfoHandler
  implements IQueryHandler<GetCartInfoQuery, GetCartInfoResult>
{
  constructor(
    @InjectPinoLogger(GetCartInfoHandler.name)
    private readonly logger: PinoLogger,
    @Inject(CART_SERVICE)
    private readonly service: ICartService,
  ) {}

  async execute(query: GetCartInfoQuery): Promise<GetCartInfoResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );
    const cart = await this.service.getCart(query);
    if (!cart) {
      throw createBadRequestException('cart-not-found');
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
    return new GetCartInfoResult(cart);
  }
}
