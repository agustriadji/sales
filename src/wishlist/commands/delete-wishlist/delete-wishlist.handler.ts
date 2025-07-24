import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { createBadRequestException } from '@wings-online/common';
import { WishlistRemoved } from '@wings-online/wishlist/domains/events';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';
import { WISHLIST_WRITE_REPOSITORY } from '@wings-online/wishlist/wishlist.constants';

import { DeleteWishlistCommand } from './delete-wishlist.command';

@CommandHandler(DeleteWishlistCommand)
export class DeleteWishlistHandler
  implements ICommandHandler<DeleteWishlistCommand, void>
{
  constructor(
    @InjectPinoLogger(DeleteWishlistHandler.name)
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
  async execute(command: DeleteWishlistCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, id } = command.data;

    const wishlist = await this.wishlistRepository.findById(id, identity.id);

    if (!wishlist) {
      throw createBadRequestException('wishlist-not-found');
    }

    if (wishlist.isDefault) {
      throw createBadRequestException('default-wishlist-unmodifiable');
    }

    await this.wishlistRepository.delete(wishlist.id.value, identity);
    await this.eventBus.publish(
      new WishlistRemoved({
        identity,
        wishlistId: id,
        itemIds: wishlist.items.currentItems.map((i) => i.itemId.value),
      }),
    );

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
