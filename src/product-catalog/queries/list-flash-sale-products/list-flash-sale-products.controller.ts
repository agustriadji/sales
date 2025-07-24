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
import { HttpCacheInterceptor, UserIdentity } from '@wings-online/common';

import { ListFlashSaleProductsQuery } from './list-flash-sale-products.query';
import { ListFlashSaleProductsQueryDto } from './list-flash-sale-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListFlashSaleProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.flash-sale.list')
  async handler(
    @Query() qs: ListFlashSaleProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListFlashSaleProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
      sort: qs.sort,
      filter: qs.filter,
      status: qs.status,
    });
    return this.queryBus.execute(query);
  }
}
