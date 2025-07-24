import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EntityId } from '@wings-corporation/domain';
import { createBadRequestException } from '@wings-online/common';
import { Wishlist } from '@wings-online/wishlist/domains';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';
import { WISHLIST_WRITE_REPOSITORY } from '@wings-online/wishlist/wishlist.constants';

import { AddWishlistItemsCommand } from './add-wishlist-items.command';

@CommandHandler(AddWishlistItemsCommand)
export class AddWishlistItemsHandler
  implements ICommandHandler<AddWishlistItemsCommand, void>
{
  constructor(
    @InjectPinoLogger(AddWishlistItemsHandler.name)
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
  async execute(command: AddWishlistItemsCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, wishlistId, itemIds } = command.data;

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

    itemIds.forEach((itemId) => {
      wishlist.addItem(
        {
          itemId: EntityId.fromString(itemId),
          wishlistId: wishlist.id,
        },
        identity,
      );
    });

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
