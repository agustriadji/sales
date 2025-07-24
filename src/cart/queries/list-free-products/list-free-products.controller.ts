import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListFreeProductsQuery } from './list-free-products.query';
import { ListFreeProductsQueryDto } from './list-free-products.query.dto';

@Controller()
export class ListFreeProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/cart.free-product.list')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: ListFreeProductsQueryDto,
  ): Promise<any> {
    const query = new ListFreeProductsQuery({
      identity,
      type: qs.type,
    });
    return this.queryBus.execute(query);
  }
}
