import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListBrandVariantsQuery } from './list-brand-variants.query';
import { ListBrandVariantsQueryDto } from './list-brand-variants.query.dto';

@Controller()
export class ListBrandVariantsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/brands.variants.list')
  async handler(
    @Query() qs: ListBrandVariantsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new ListBrandVariantsQuery({
      ...qs,
      identity,
      activeItemId: qs.active_item_id,
    });
    return this.queryBus.execute(query);
  }
}
