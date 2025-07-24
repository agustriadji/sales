import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { GetCartInfoQuery } from './get-cart-info.query';
import { GetCartInfoQueryDto } from './get-cart-info.query.dto';

@Controller()
export class GetCartInfoController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/cart.info')
  async handler(
    @Query() qs: GetCartInfoQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new GetCartInfoQuery({
      identity,
      type: qs.type,
    });
    return this.queryBus.execute(query);
  }
}
