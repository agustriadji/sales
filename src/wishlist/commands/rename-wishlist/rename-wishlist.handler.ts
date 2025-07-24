import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { createBadRequestException } from '@wings-online/common';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';
import { WISHLIST_WRITE_REPOSITORY } from '@wings-online/wishlist/wishlist.constants';

import { RenameWishlistCommand } from './rename-wishlist.command';

@CommandHandler(RenameWishlistCommand)
export class RenameWishlistHandler
  implements ICommandHandler<RenameWishlistCommand, void>
{
  constructor(
    @InjectPinoLogger(RenameWishlistHandler.name)
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
  async execute(command: RenameWishlistCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, id, name } = command.data;

    const [wishlist, exists] = await Promise.all([
      this.wishlistRepository.findById(id, identity.id),
      this.wishlistRepository.isNameExists(identity.id, name),
    ]);

    if (!wishlist) {
      throw createBadRequestException('wishlist-not-found');
    } else if (exists) {
      throw createBadRequestException('wishlist-already-exists');
    }

    if (wishlist.isDefault) {
      throw createBadRequestException('default-wishlist-unmodifiable');
    }

    wishlist.rename(name, identity);
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
