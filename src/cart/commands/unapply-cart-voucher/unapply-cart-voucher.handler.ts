import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import { CART_VOUCHER_WRITE_REPOSITORY } from '@wings-online/app.constants';
import { ICartVoucherAggregate } from '@wings-online/cart/domains';
import { ICartVoucherWriteRepository } from '@wings-online/cart/interfaces';
import {
  CommandHandlerWithMutex,
  createBadRequestException,
  LockUtil,
} from '@wings-online/common';

import { UnapplyCartVoucherCommand } from './unapply-cart-voucher.command';

@CommandHandler(UnapplyCartVoucherCommand)
export class UnapplyCartVoucherHandler extends CommandHandlerWithMutex<
  UnapplyCartVoucherCommand,
  void
> {
  constructor(
    @InjectPinoLogger(UnapplyCartVoucherHandler.name)
    logger: PinoLogger,
    uowService: TypeOrmUnitOfWorkService,
    mutexService: MutexService,
    @Inject(CART_VOUCHER_WRITE_REPOSITORY)
    private readonly cartVoucherRepository: ICartVoucherWriteRepository,
  ) {
    super(mutexService, uowService, { logger });
  }

  getLockKey(command: UnapplyCartVoucherCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  async handler(command: UnapplyCartVoucherCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );
    const { identity, voucherIds, type } = command.data;

    const cart =
      await this.cartVoucherRepository.getCart<ICartVoucherAggregate>(
        type,
        identity,
      );
    if (!cart) throw createBadRequestException('cart-not-found');

    for (const voucherId of voucherIds) {
      cart.unapplyVoucher(voucherId);
    }

    await this.cartVoucherRepository.save(cart);

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
