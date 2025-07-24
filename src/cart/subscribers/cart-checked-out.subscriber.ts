import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { Inject } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { IEventBus, IIntegrationEvent } from '@wings-corporation/core';
import { EVENT_BUS } from '@wings-corporation/nest-event-bus';
import { CartCheckedOut } from '@wings-online/cart/domains/events';
import { TypeOrmEventEntity } from '@wings-online/cart/entities';

@EventsHandler(CartCheckedOut)
export class CartCheckedOutSubscriber implements IEventHandler<CartCheckedOut> {
  constructor(
    @InjectPinoLogger(CartCheckedOutSubscriber.name)
    private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus<IIntegrationEvent>,
  ) {}

  async handle(event: CartCheckedOut) {
    this.logger.info({ event });

    if (event.name === 'CartCheckedOut') {
      try {
        const publishResult = await this.eventBus.publish([event]);

        const eventsToDelete = publishResult.events
          .filter((event) => event.errorMessage === undefined)
          .map((event) => event.id);

        await this.dataSource
          .createQueryBuilder(TypeOrmEventEntity, 'event')
          .delete()
          .whereInIds(eventsToDelete)
          .execute();
      } catch (e) {
        this.logger.error(e);
      }
    }
  }
}
