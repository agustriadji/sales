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

import { ListWishlistsQuery } from './list-wishlists.query';
import { ListWishlistsQueryDto } from './list-wishlists.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListWishlistsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/wishlist.list')
  async handler(
    @Query() qs: ListWishlistsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListWishlistsQuery({
      identity,
      limit: qs.limit,
      cursor: qs.cursor,
    });
    return this.queryBus.execute(query);
  }
}
