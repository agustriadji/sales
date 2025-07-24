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

import { ListCategoryProductsQuery } from './list-category-products.query';
import { ListCategoryProductsQueryDto } from './list-category-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListCategoryProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/categories.products.list')
  async handler(
    @Query() qs: ListCategoryProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListCategoryProductsQuery({
      ...qs,
      identity,
      categoryId: qs.category_id,
      pageSize: qs.page_size,
    });
    return this.queryBus.execute(query);
  }
}
