import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { Quantity } from '@wings-corporation/domain';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import {
  CART_WRITE_REPOSITORY,
  SALES_ITEM_WRITE_REPOSITORY,
  TagKeys,
} from '@wings-online/app.constants';
import { Tag } from '@wings-online/cart/domains';
import {
  ICartWriteRepository,
  ISalesItemWriteRepository,
} from '@wings-online/cart/interfaces';
import { CartUtils } from '@wings-online/cart/utils/cart.utils';
import { CommandHandlerWithMutex, LockUtil } from '@wings-online/common';

import { DeleteCartItemCommand } from './delete-cart-item.command';
import { DeleteCartItemResult } from './delete-cart-item.result';

@CommandHandler(DeleteCartItemCommand)
export class DeleteCartItemHandler extends CommandHandlerWithMutex<
  DeleteCartItemCommand,
  DeleteCartItemResult
> {
  constructor(
    @InjectPinoLogger(DeleteCartItemHandler.name)
    logger: PinoLogger,
    uowService: TypeOrmUnitOfWorkService,
    mutexService: MutexService,
    @Inject(CART_WRITE_REPOSITORY)
    private readonly cartRepository: ICartWriteRepository,
    @Inject(SALES_ITEM_WRITE_REPOSITORY)
    private readonly salesItemRepository: ISalesItemWriteRepository,
    private readonly eventBus: EventBus,
  ) {
    super(mutexService, uowService, { logger });
  }

  async afterCommit(
    command: DeleteCartItemCommand,
    result: DeleteCartItemResult,
  ): Promise<DeleteCartItemResult> {
    const events = result.events.map((event) =>
      event.withCommandMetadata(command),
    );
    await this.eventBus.publishAll(events);
    return result;
  }

  getLockKey(command: DeleteCartItemCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  async handler(command: DeleteCartItemCommand): Promise<DeleteCartItemResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, itemId, type } = command.data;

    let itemTags: Tag[] = [];

    const item = await this.salesItemRepository.getSalesItem(itemId, identity);
    if (item) {
      itemTags = item.tags;
    }

    const cart = await this.cartRepository.getBuyerCart(identity, type);
    if (!cart)
      return new DeleteCartItemResult({ id: itemId, count: 0 }, [], []);

    cart.removeItem(identity, itemId);

    await this.cartRepository.save(cart);

    const cartTags = cart.tags.getItems();
    const cartItems = cart.items.getItems();

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

    const events = cart.flushEvents();

    return new DeleteCartItemResult(
      {
        id: itemId,
        count: cart.items.currentItems.length,
      },
      itemTags
        .filter((tag) =>
          TagKeys.some((validKey) => tag.key.startsWith(validKey)),
        )
        .map((tag) => {
          const cartTag = cartTags.find((t) => t.tag.equals(tag));
          return {
            tag,
            qty: cartTag?.qty || Quantity.zero(),
            itemCombination: cart ? cart.countTagItemCombination(tag).value : 0,
            items: CartUtils.filterCartItemByTag(cartItems, tag).map((item) => {
              return {
                itemId: item.itemId.value,
                qty: item.qty,
                addedAt: item.addedAt,
              };
            }),
          };
        }),
      events,
    );
  }
}
