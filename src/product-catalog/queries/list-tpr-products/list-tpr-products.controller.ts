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

import { ListTPRProductsQuery } from './list-tpr-products.query';
import { ListTPRProductsQueryDto } from './list-tpr-products.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListTPRProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.list.tpr')
  async handler(
    @Query() qs: ListTPRProductsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListTPRProductsQuery({
      ...qs,
      pageSize: qs.page_size,
      identity,
    });
    return this.queryBus.execute(query);
  }
}
