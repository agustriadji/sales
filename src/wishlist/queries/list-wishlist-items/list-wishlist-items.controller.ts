import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { EntityId } from '@wings-corporation/domain';
import { Identity } from '@wings-corporation/nest-http';
import { HttpCacheInterceptor, UserIdentity } from '@wings-online/common';

import { ListWishlistItemsQuery } from './list-wishlist-items.query';
import { ListWishlistItemsQueryDto } from './list-wishlist-items.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class ListWishlistItemsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/wishlist.items.list')
  async handler(
    @Query() qs: ListWishlistItemsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListWishlistItemsQuery({
      identity,
      id: EntityId.fromString(qs.id),
      page: qs.page,
      pageSize: qs.page_size,
    });
    return this.queryBus.execute(query);
  }
}
