import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListCategoryQuery } from './list-category.query';
import { ListCategoryQueryDto } from './list-category.query.dto';

@Controller()
export class ListCategoryController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/categories.list')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: ListCategoryQueryDto,
  ): Promise<any> {
    const query = new ListCategoryQuery({ identity, ...qs });
    return this.queryBus.execute(query);
  }
}
