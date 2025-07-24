import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { createBadRequestException } from '@wings-online/common';
import { Wishlist } from '@wings-online/wishlist/domains';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';
import { WISHLIST_WRITE_REPOSITORY } from '@wings-online/wishlist/wishlist.constants';

import { RemoveWishlistItemCommand } from './remove-wishlist-item.command';

@CommandHandler(RemoveWishlistItemCommand)
export class RemoveWishlistItemHandler
  implements ICommandHandler<RemoveWishlistItemCommand, void>
{
  constructor(
    @InjectPinoLogger(RemoveWishlistItemHandler.name)
    private readonly logger: PinoLogger,
    @Inject(WISHLIST_WRITE_REPOSITORY)
    private readonly wishlistRepository: IWishlistWriteRepository,
    private readonly eventBus: EventBus,
  ) {}

  /**
   *
   * @param command
   * @returns
   */
  async execute(command: RemoveWishlistItemCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, wishlistId, itemId } = command.data;

    let wishlist: Wishlist;
    if (wishlistId) {
      const foundWishlist = await this.wishlistRepository.findById(
        wishlistId,
        identity.id,
      );
      if (!foundWishlist) {
        throw createBadRequestException('wishlist-not-found');
      }
      wishlist = foundWishlist;
    } else {
      wishlist = await this.wishlistRepository.findDefault(identity.id);
    }

    wishlist.removeItem(itemId, identity);
    await this.wishlistRepository.save(wishlist);

    const events = wishlist.flushEvents();
    await this.eventBus.publishAll(events);

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
  }
}
