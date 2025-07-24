import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListProductPromotionsQuery } from './list-product-promotions.query';
import { ListProductPromotionsQueryDto } from './list-product-promotions.query.dto';

@Controller()
export class ListProductPromotionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.promotions.list')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: ListProductPromotionsQueryDto,
  ): Promise<any> {
    const query = new ListProductPromotionsQuery({
      identity,
      ...qs,
    });
    return this.queryBus.execute(query);
  }
}
