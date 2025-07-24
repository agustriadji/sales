import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListBannersQuery } from './list-banners.query';
import { ListBannersQueryDto } from './list-banners.query.dto';

@Controller()
export class ListBannersController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/banners.list')
  async handler(
    @Query() qs: ListBannersQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListBannersQuery({
      identity,
      page: qs.page,
      pageSize: qs.page_size,
      filter: qs.filter,
    });
    return this.queryBus.execute(query);
  }
}
