import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus } from '@nestjs/cqrs';
import { EntityId, Quantity } from '@wings-corporation/domain';
import { MutexService } from '@wings-corporation/nest-advisory-lock-mutex';
import { TypeOrmUnitOfWorkService } from '@wings-corporation/nest-typeorm-uow';
import {
  CART_WRITE_REPOSITORY,
  SALES_ITEM_WRITE_REPOSITORY,
  TagKeys,
} from '@wings-online/app.constants';
import { CartFactory } from '@wings-online/cart/domains';
import {
  ICartWriteRepository,
  ISalesItemWriteRepository,
} from '@wings-online/cart/interfaces';
import { CartUtils } from '@wings-online/cart/utils/cart.utils';
import {
  CommandHandlerWithMutex,
  IdentityUtil,
  LockUtil,
  createBadRequestException,
} from '@wings-online/common';

import { PutCartItemCommand } from './put-cart-item.command';
import { PutCartItemResult } from './put-cart-item.result';

@CommandHandler(PutCartItemCommand)
export class PutCartItemHandler extends CommandHandlerWithMutex<
  PutCartItemCommand,
  PutCartItemResult
> {
  constructor(
    @InjectPinoLogger(PutCartItemHandler.name)
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

  getLockKey(command: PutCartItemCommand): string {
    return LockUtil.getCartLockKey(command.data.identity);
  }

  async afterCommit(
    command: PutCartItemCommand,
    result: PutCartItemResult,
  ): Promise<PutCartItemResult> {
    const events = result.events.map((event) =>
      event.withCommandMetadata(command),
    );
    await this.eventBus.publishAll(events);
    return result;
  }

  async handler(command: PutCartItemCommand): Promise<PutCartItemResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ command });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { identity, itemId, baseQty, packQty } = command.data;

    const item = await this.salesItemRepository.getSalesItem(itemId, identity);
    if (!item) throw createBadRequestException(`item-not-found`);
    if (!item.isActive) throw createBadRequestException('item-not-active');
    if (packQty && !item.pack)
      throw createBadRequestException('pack-not-available');

    let cart = await this.cartRepository.getBuyerCart(identity, item.type);
    if (!cart) {
      const defaultAddressId = IdentityUtil.getDefaultAddressId(
        identity,
        item.type,
      );

      cart = this.cartFactory.create({
        buyerId: EntityId.fromString(identity.id),
        deliveryAddressId: defaultAddressId
          ? EntityId.fromString(defaultAddressId)
          : null,
        type: item.type,
      });
    }

    cart.putItem(
      identity,
      item,
      Quantity.create(baseQty),
      Quantity.create(packQty),
    );

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
    return new PutCartItemResult(
      {
        id: itemId,
        count: cart.items.currentItems.length,
      },
      item.tags
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
