import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler } from '@nestjs/cqrs';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import {
  BUYER_WRITE_REPOSITORY,
  CART_WRITE_REPOSITORY,
} from '@wings-online/app.constants';
import {
  IBuyerWriteRepository,
  ICartWriteRepository,
} from '@wings-online/cart/interfaces';
import {
  CommandHandlerWithMutex,
  createBadRequestException,
  LockUtil,
} from '@wings-online/common';

import { UpdateCartAddressCommand } from './update-cart-address.command';

@CommandHandler(UpdateCartAddressCommand)
export class UpdateCartAddressHandler extends CommandHandlerWithMutex<
  UpdateCartAddressCommand,
  void
> {
  constructor(
    @InjectPinoLogger(UpdateCartAddressHandler.name)
    logger: PinoLogger,
    uowService: TypeOrmUnitOfWorkService,
    mutexService: MutexService,
    @Inject(BUYER_WRITE_REPOSITORY)
    private readonly buyerRepository: IBuyerWriteRepository,
    @Inject(CART_WRITE_REPOSITORY)
    private readonly cartRepository: ICartWriteRepository,
  ) {
    super(mutexService, uowService, { logger });
  }

  getLockKey(command: UpdateCartAddressCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  async handler(command: UpdateCartAddressCommand): Promise<void> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, deliveryAddressId, type } = command.data;

    const exist = await this.buyerRepository.isBuyerAddressExists({
      buyerId: identity.externalId,
      deliveryAddressId: deliveryAddressId,
      type,
    });

    if (!exist) throw createBadRequestException('delivery-address-not-found');

    const cart = await this.cartRepository.getBuyerCart(identity, type);
    if (!cart) return;

    cart.updateAddress(deliveryAddressId);

    await this.cartRepository.save(cart);

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
