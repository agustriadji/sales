import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CART_WRITE_REPOSITORY } from '@wings-online/app.constants';
import { ICartWriteRepository } from '@wings-online/cart/interfaces';
import { CommandHandlerWithMutex, LockUtil } from '@wings-online/common';

import { ClearCartCommand } from './clear-cart.command';
import { ClearCartResult } from './clear-cart.result';

@CommandHandler(ClearCartCommand)
export class ClearCartHandler extends CommandHandlerWithMutex<
  ClearCartCommand,
  ClearCartResult
> {
  constructor(
    @InjectPinoLogger(ClearCartHandler.name)
    logger: PinoLogger,
    uowService: TypeOrmUnitOfWorkService,
    mutexService: MutexService,
    @Inject(CART_WRITE_REPOSITORY)
    private readonly cartRepository: ICartWriteRepository,
    private readonly eventBus: EventBus,
  ) {
    super(mutexService, uowService);
  }

  async afterCommit(
    command: ClearCartCommand,
    result: ClearCartResult,
  ): Promise<ClearCartResult> {
    const events = result.events.map((event) =>
      event.withCommandMetadata(command),
    );
    await this.eventBus.publishAll(events);
    return result;
  }

  getLockKey(command: ClearCartCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  async handler(command: ClearCartCommand): Promise<ClearCartResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, type } = command.data;

    const cart = await this.cartRepository.getBuyerCart(identity, type);
    if (!cart) return new ClearCartResult([]);

    cart.clear(identity);

    await this.cartRepository.save(cart);
    const events = cart.flushEvents();

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
    return new ClearCartResult(events);
  }
}
