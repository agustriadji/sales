import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';
import { HttpCacheInterceptor } from '@wings-online/common/interceptors';

import { ListFrequentlyPurchasedProductsQuery } from './list-frequently-purchased-products.query';
import { ListFrequentlyPurchasedProductsQueryDto } from './list-frequently-purchased-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListFrequentlyPurchasedProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.frequently-purchased.list')
  async handler(
    @Query() qs: ListFrequentlyPurchasedProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListFrequentlyPurchasedProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
      sort: qs.sort,
      filter: qs.filter,
    });
    return this.queryBus.execute(query);
  }
}
