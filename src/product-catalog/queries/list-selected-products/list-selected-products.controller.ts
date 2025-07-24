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

import { ListSelectedProductsQuery } from './list-selected-products.query';
import { ListSelectedProductsQueryDto } from './list-selected-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListSelectedProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.selected.list')
  async handler(
    @Query() qs: ListSelectedProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListSelectedProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
      sort: qs.sort,
      filter: qs.filter,
    });
    return this.queryBus.execute(query);
  }
}
