import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { GetCartSimulatedPriceQuery } from './get-cart-simulated-price.query';
import { GetCartSimulatedPriceQueryDto } from './get-cart-simulated-price.query.dto';

@Controller()
export class GetCartSimulatedPriceController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/cart.simulate-price')
  async handler(
    @Query() qs: GetCartSimulatedPriceQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new GetCartSimulatedPriceQuery({
      identity,
    });
    return this.queryBus.execute(query);
  }
}
