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

import { ListSimilarProductsQuery } from './list-similar-products.query';
import { ListSimilarProductsQueryDto } from './list-similar-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListSimilarProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.similar.list')
  async handler(
    @Query() qs: ListSimilarProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListSimilarProductsQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
      sort: qs.sort,
      filter: qs.filter,
      categoryId: qs.category_id,
    });
    return this.queryBus.execute(query);
  }
}
