import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { CartSimulated } from '@wings-online/cart/domains/events';
import {
  TypeOrmCartEntity,
  TypeOrmCartSimulatedPriceEntity,
} from '@wings-online/cart/entities';

@EventsHandler(CartSimulated)
export class CartSimulatedSubscriber implements IEventHandler<CartSimulated> {
  constructor(
    @InjectPinoLogger(CartSimulatedSubscriber.name)
    private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async handle(event: CartSimulated) {
    this.logger.info({ event });

    const { data, timestamp } = event;

    try {
      await this.dataSource.createEntityManager().transaction(async (trx) => {
        await trx.update(
          TypeOrmCartEntity,
          { id: data.id },
          {
            simulatedAt: timestamp,
            updatedAt: timestamp,
          },
        );

        await trx.upsert(
          TypeOrmCartSimulatedPriceEntity,
          data.items.map((cartItem) => ({
            cartItemId: cartItem.id,
            subtotal: cartItem.subtotal,
            total: cartItem.total,
            flashSaleDiscount: cartItem.flashSaleDiscount,
            regularDiscount: cartItem.regularDiscount,
            lifetimeDiscount: cartItem.lifetimeDiscount,
          })),
          ['cartItemId'],
        );
      });
    } catch (err) {
      this.logger.warn(err);
    }
  }
}
