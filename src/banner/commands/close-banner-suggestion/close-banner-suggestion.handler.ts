import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BANNER_WRITE_REPOSITORY } from '@wings-online/banner/banner.constants';
import { IBannerWriteRepository } from '@wings-online/banner/interfaces';

import { CloseBannerSuggestionCommand } from './close-banner-suggestion.command';

@CommandHandler(CloseBannerSuggestionCommand)
export class CloseBannerSuggestionHandler
  implements ICommandHandler<CloseBannerSuggestionCommand, void>
{
  constructor(
    @InjectPinoLogger(CloseBannerSuggestionHandler.name)
    private readonly logger: PinoLogger,
    @Inject(BANNER_WRITE_REPOSITORY)
    private readonly wishlistRepository: IBannerWriteRepository,
  ) {}

  /**
   *
   * @param command
   * @returns
   */
  async execute(command: CloseBannerSuggestionCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });

    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, type } = command.data;

    await this.wishlistRepository.closeSuggestion(identity.id, type);

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
