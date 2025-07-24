import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { GetFilterQuery } from './get-filter.query';
import { GetFilterQueryDto } from './get-filter.query.dto';

@Controller()
export class GetFilterController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/filter')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: GetFilterQueryDto,
  ): Promise<any> {
    const query = new GetFilterQuery({
      identity,
      categoryId: qs.category_id,
      brandId: qs.brand_id || [],
      hetRange:
        qs.het_range?.map((range) => {
          const [from, to] = range.split('-');
          return {
            from: Number(from),
            to: to ? Number(to) : undefined,
          };
        }) || [],
      variant: qs.variant || [],
      packSize: qs.pack_size || [],
      recommendation: qs.recommendation,
      isBestSeller: qs.is_best_seller,
      isLowStock: qs.is_low_stock,
      isNew: qs.is_new,
      search: qs.search,
    });
    return this.queryBus.execute(query);
  }
}
