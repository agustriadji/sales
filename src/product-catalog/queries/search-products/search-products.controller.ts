import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { SearchProductsQuery } from './search-products.query';
import { SearchProductsQueryDto } from './search-products.query.dto';

@Controller()
export class SearchProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.search')
  async handler(
    @Query() qs: SearchProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new SearchProductsQuery({
      identity,
      categoryId: qs.category_id,
      ...qs,
    });
    return this.queryBus.execute(query);
  }
}
