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

import { ListProductsQuery } from './list-products.query';
import { ListProductsQueryDto } from './list-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.list')
  async handler(
    @Query() qs: ListProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListProductsQuery({
      ...qs,
      pageSize: qs.page_size,
      identity,
      excludeInsideCart: qs.exclude_inside_cart,
    });
    return this.queryBus.execute(query);
  }
}
