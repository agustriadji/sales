import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';
import { CategoryTypes } from '@wings-online/product-catalog/product-catalog.constants';

import { ListBrandQuery } from './list-brand.query';
import { ListBrandQueryDto } from './list-brand.query.dto';

@Controller()
export class ListBrandController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/brands.list')
  async handler(
    @Query() qs: ListBrandQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListBrandQuery({
      type: qs.type as CategoryTypes,
      identity,
    });
    return this.queryBus.execute(query);
  }
}
