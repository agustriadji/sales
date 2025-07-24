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

import { ListNewProductsQuery } from './list-new-products.query';
import { ListNewProductsQueryDto } from './list-new-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListNewProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.new.list')
  async handler(
    @Query() qs: ListNewProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListNewProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
      sort: qs.sort,
      filter: qs.filter,
    });
    return this.queryBus.execute(query);
  }
}
