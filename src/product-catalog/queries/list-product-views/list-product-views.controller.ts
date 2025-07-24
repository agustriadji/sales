import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListProductViewsQuery } from './list-product-views.query';
import { ListProductViewsQueryDto } from './list-product-views.query.dto';

@Controller()
export class ListProductViewsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.views')
  async handler(
    @Query() qs: ListProductViewsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListProductViewsQuery({
      identity,
      categoryId: qs.category_id,
    });
    return this.queryBus.execute(query);
  }
}
