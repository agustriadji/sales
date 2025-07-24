import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { createBadRequestException } from '@wings-online/common';
import { Wishlist } from '@wings-online/wishlist/domains';
import { WishlistAdded } from '@wings-online/wishlist/domains/events';
import { IWishlistWriteRepository } from '@wings-online/wishlist/interfaces';
import { WISHLIST_WRITE_REPOSITORY } from '@wings-online/wishlist/wishlist.constants';

import { CreateWishlistCommand } from './create-wishlist.command';
import { CreateWishlistResult } from './create-wishlist.result';

@CommandHandler(CreateWishlistCommand)
export class CreateWishlistHandler
  implements ICommandHandler<CreateWishlistCommand, CreateWishlistResult>
{
  constructor(
    @InjectPinoLogger(CreateWishlistHandler.name)
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
  async execute(command: CreateWishlistCommand): Promise<CreateWishlistResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, name } = command.data;

    const exists = await this.wishlistRepository.isNameExists(
      identity.id,
      name,
    );
    if (exists) throw createBadRequestException('wishlist-already-exists');

    const wishlist = Wishlist.create({ buyerId: identity.id, name });
    await this.wishlistRepository.save(wishlist);
    await this.eventBus.publish(
      new WishlistAdded({
        identity,
        wishlistId: wishlist.id.value,
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
    return new CreateWishlistResult({ id: wishlist.id.value });
  }
}
