import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DEFAULT_QUERY_LIMIT } from '@wings-corporation/nest-http';
import { IWishlistReadRepository } from '@wings-online/wishlist/interfaces';
import { WISHLIST_READ_REPOSITORY } from '@wings-online/wishlist/wishlist.constants';

import { ListWishlistsQuery } from './list-wishlists.query';
import { ListWishlistsResult } from './list-wishlists.result';

@QueryHandler(ListWishlistsQuery)
export class ListWishlistsHandler
  implements IQueryHandler<ListWishlistsQuery, ListWishlistsResult>
{
  constructor(
    @InjectPinoLogger(ListWishlistsHandler.name)
    private readonly logger: PinoLogger,
    @Inject(WISHLIST_READ_REPOSITORY)
    private readonly repository: IWishlistReadRepository,
  ) {}

  async execute(query: ListWishlistsQuery): Promise<ListWishlistsResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const collection = await this.repository.getWishlists({
      ...query,
      limit: query.limit || DEFAULT_QUERY_LIMIT,
    });

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

    return new ListWishlistsResult(collection);
  }
}
