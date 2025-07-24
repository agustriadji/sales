import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { EntityId, Quantity } from '@wings-corporation/domain';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import {
  CART_WRITE_REPOSITORY,
  SALES_ITEM_WRITE_REPOSITORY,
} from '@wings-online/app.constants';
import { CartFactory } from '@wings-online/cart/domains';
import {
  ICartWriteRepository,
  ISalesItemWriteRepository,
} from '@wings-online/cart/interfaces';
import {
  CommandHandlerWithMutex,
  IdentityUtil,
  LockUtil,
} from '@wings-online/common';

import { BulkPutCartItemCommand } from './bulk-put-cart-item.command';
import {
  BulkPutCartItemResult,
  BulkPutCartItemResultProps,
} from './bulk-put-cart-item.result';

@CommandHandler(BulkPutCartItemCommand)
export class BulkPutCartItemHandler extends CommandHandlerWithMutex<
  BulkPutCartItemCommand,
  BulkPutCartItemResult
> {
  constructor(
    @InjectPinoLogger(BulkPutCartItemHandler.name)
    logger: PinoLogger,
    uowService: TypeOrmUnitOfWorkService,
    mutexService: MutexService,
    @Inject(SALES_ITEM_WRITE_REPOSITORY)
    private readonly salesItemRepository: ISalesItemWriteRepository,
    @Inject(CART_WRITE_REPOSITORY)
    private readonly cartRepository: ICartWriteRepository,
    private readonly cartFactory: CartFactory,
    private readonly eventBus: EventBus,
  ) {
    super(mutexService, uowService, { logger });
  }

  getLockKey(command: BulkPutCartItemCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  async afterCommit(
    command: BulkPutCartItemCommand,
    result: BulkPutCartItemResult,
  ): Promise<BulkPutCartItemResult> {
    const events = result.events.map((event) =>
      event.withCommandMetadata(command),
    );
    await this.eventBus.publishAll(events);
    return result;
  }

  async handler(
    command: BulkPutCartItemCommand,
  ): Promise<BulkPutCartItemResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, items } = command.data;

    const [salesItems, carts] = await Promise.all([
      this.salesItemRepository.getSalesItems(
        items.map((item) => item.itemId),
        identity,
      ),
      this.cartRepository.getBuyerCarts(identity),
    ]);

    const result: Array<BulkPutCartItemResultProps> = [];
    for (const item of items) {
      try {
        const salesItem = salesItems.find(
          (salesItem) => salesItem.id.value === item.itemId,
        );

        if (
          !salesItem ||
          !salesItem.isActive ||
          (!item.packQty && !salesItem.pack)
        ) {
          throw new Error('Item not found');
        }

        let cart = carts.find((cart) => cart.type === salesItem.type);
        if (!cart) {
          const defaultAddressId = IdentityUtil.getDefaultAddressId(
            identity,
            salesItem.type,
          );

          cart = this.cartFactory.create({
            buyerId: EntityId.fromString(identity.id),
            deliveryAddressId: defaultAddressId
              ? EntityId.fromString(defaultAddressId)
              : null,
            type: salesItem.type,
          });

          carts.push(cart);
        }

        cart.putItem(
          identity,
          salesItem,
          Quantity.create(item.baseQty),
          Quantity.create(item.packQty),
          true,
        );

        result.push({ itemId: item.itemId, result: 'ok' });
      } catch (e) {
        this.logger.error(e);
        result.push({ itemId: item.itemId, result: `error: ${e.message}` });
      }
    }

    const events: Array<any> = [];
    for (const cart of carts) {
      await this.cartRepository.save(cart);
      events.push(...cart.flushEvents());
    }

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

    return new BulkPutCartItemResult(result, events);
  }
}
