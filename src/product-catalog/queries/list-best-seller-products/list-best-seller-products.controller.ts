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

import { ListBestSellerProductsQuery } from './list-best-seller-products.query';
import { ListBestSellerProductsQueryDto } from './list-best-seller-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListBestSellerProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.best-seller.list')
  async handler(
    @Query() qs: ListBestSellerProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListBestSellerProductsQuery({
      identity,
      limit: qs.limit,
      cursor: qs.cursor,
      categoryId: qs.category_id,
    });
    return this.queryBus.execute(query);
  }
}
