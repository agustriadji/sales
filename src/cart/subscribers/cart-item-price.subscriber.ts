import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { Money } from '@wings-corporation/domain';
import { KeyUtil } from '@wings-corporation/utils';
import { SalesItemPrice } from '@wings-online/cart/domains';
import {
  CartItemAdded,
  CartItemQtyChanged,
} from '@wings-online/cart/domains/events';
import {
  TypeOrmBuyerEntity,
  TypeOrmCartItemPriceEntity,
  TypeOrmItemPriceEntity,
} from '@wings-online/cart/entities';
import { SalesTier, SalesUtil } from '@wings-online/common';

type CartItemPriceSubscribedEvents = CartItemAdded | CartItemQtyChanged;

@EventsHandler(CartItemAdded, CartItemQtyChanged)
export class CartItemPriceSubscriber
  implements IEventHandler<CartItemPriceSubscribedEvents>
{
  constructor(
    @InjectPinoLogger(CartItemPriceSubscriber.name)
    private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async handle(event: CartItemPriceSubscribedEvents) {
    this.logger.info({ event });

    const { data } = event;

    try {
      await this.dataSource.createEntityManager().transaction(async (trx) => {
        const buyer = await trx
          .createQueryBuilder(TypeOrmBuyerEntity, 'buyer')
          .where('id = :id', { id: data.identity.id })
          .getOneOrFail();

        const entities = await trx
          .createQueryBuilder(TypeOrmItemPriceEntity, 'prices')
          .setLock('pessimistic_write')
          .where('prices.itemId = :itemId', { itemId: data.itemId })
          .andWhere(
            'prices.priceKey in (:...keys) AND prices.validFrom <= now() AND prices.validTo >= now()',
            {
              keys: KeyUtil.getSalesPriceKeys(data.identity),
            },
          )
          .getMany();

        const prices = entities.map((x) => {
          return SalesItemPrice.create(
            SalesTier.create(x.tier),
            Money.create(x.price),
          );
        });

        const price = SalesUtil.getEffectiveSalesPrice(prices);
        if (price) {
          await this.dataSource.createEntityManager().upsert(
            TypeOrmCartItemPriceEntity,
            {
              cartItemId: data.cartItemId,
              price: price.value,
            },
            ['cartItemId'],
          );
        } else {
          // TODO how to handle this ?
        }
      });
    } catch (err) {
      // TODO find a better way to handle this
      console.error(err);
    }
  }
}
