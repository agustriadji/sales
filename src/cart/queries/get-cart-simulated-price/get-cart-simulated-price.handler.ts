import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBus, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DivisionEnum } from '@wings-corporation/core';
import { CART_SERVICE } from '@wings-online/app.constants';
import { CartSimulated } from '@wings-online/cart/domains/events';
import {
  GetTotalPriceResponse,
  ICartService,
} from '@wings-online/cart/interfaces';
import { CartReadModel } from '@wings-online/cart/read-models';
import { createBadRequestException } from '@wings-online/common';

import { GetCartSimulatedPriceQuery } from './get-cart-simulated-price.query';
import { GetCartSimulatedPriceResult } from './get-cart-simulated-price.result';

@QueryHandler(GetCartSimulatedPriceQuery)
export class GetCartSimulatedPriceHandler
  implements
    IQueryHandler<GetCartSimulatedPriceQuery, GetCartSimulatedPriceResult>
{
  private SKIP_SAP_SIMULATE_PRICE: boolean;
  constructor(
    @InjectPinoLogger(GetCartSimulatedPriceHandler.name)
    private readonly logger: PinoLogger,
    @Inject(CART_SERVICE)
    private readonly service: ICartService,
    private readonly eventBus: EventBus,
    private readonly config: ConfigService,
  ) {}

  /**
   *
   * @param query
   */
  async execute(
    query: GetCartSimulatedPriceQuery,
  ): Promise<GetCartSimulatedPriceResult> {
    this.logger.trace(`BEGIN`);
    this.logger.info({ query });
    this.logger.info(
      { memoryUsage: process.memoryUsage() },
      'Current Memory Usage',
    );

    const { dry, frozen } = query.identity.division;
    const getCartPromises: Promise<CartReadModel | undefined>[] = [];

    if (dry) {
      getCartPromises.push(
        this.service.getCart({
          identity: query.identity,
          type: DivisionEnum.DRY,
        }),
      );
    } else {
      getCartPromises.push(Promise.resolve(undefined));
    }

    if (frozen) {
      getCartPromises.push(
        this.service.getCart({
          identity: query.identity,
          type: DivisionEnum.FROZEN,
        }),
      );
    } else {
      getCartPromises.push(Promise.resolve(undefined));
    }

    const [dryCart, frozenCart] = await Promise.all(getCartPromises);

    if (!dryCart && !frozenCart) {
      throw createBadRequestException('cart-not-found');
    }

    const getSimulatedPricePromises: Promise<
      GetTotalPriceResponse | undefined
    >[] = [];

    const skipSimulatePrice =
      this.config.get('SKIP_SAP_SIMULATE_PRICE') === 'true' ||
      this.config.get('SKIP_SAP_SIMULATE_PRICE') === '1';
    if (!skipSimulatePrice) {
      if (dryCart) {
        getSimulatedPricePromises.push(
          this.service.getSimulatedPrice({
            identity: query.identity,
            cart: dryCart,
            division: DivisionEnum.DRY,
          }),
        );
      } else {
        getSimulatedPricePromises.push(Promise.resolve(undefined));
      }

      if (frozenCart) {
        getSimulatedPricePromises.push(
          this.service.getSimulatedPrice({
            identity: query.identity,
            cart: frozenCart,
            division: DivisionEnum.FROZEN,
          }),
        );
      } else {
        getSimulatedPricePromises.push(Promise.resolve(undefined));
      }
    }

    let dryTotalPrice: GetTotalPriceResponse | undefined = undefined;
    let frozenTotalPrice: GetTotalPriceResponse | undefined = undefined;

    if (getSimulatedPricePromises.length) {
      [dryTotalPrice, frozenTotalPrice] = await Promise.all(
        getSimulatedPricePromises,
      );
    }

    const events: CartSimulated[] = [];
    if (dryCart && dryTotalPrice) {
      events.push(
        new CartSimulated({
          id: dryCart.id,
          items: dryTotalPrice.items.map((x) => ({
            id: x.cart_item_id,
            subtotal: x.gross_price,
            total: x.net_price,
            flashSaleDiscount: x.flash_sale_discount,
            regularDiscount: x.regular_discount,
            lifetimeDiscount: x.lifetime_discount,
          })),
        }),
      );
    }

    if (frozenCart && frozenTotalPrice) {
      events.push(
        new CartSimulated({
          id: frozenCart.id,
          items: frozenTotalPrice.items.map((x) => ({
            id: x.cart_item_id,
            subtotal: x.gross_price,
            total: x.net_price,
            flashSaleDiscount: x.flash_sale_discount,
            regularDiscount: x.regular_discount,
            lifetimeDiscount: x.lifetime_discount,
          })),
        }),
      );
    }

    if (events.length) {
      await this.eventBus.publishAll(events);
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

    return new GetCartSimulatedPriceResult({
      dryCart,
      dryTotalPrice,
      frozenCart,
      frozenTotalPrice,
    });
  }
}
