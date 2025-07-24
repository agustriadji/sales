import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListProductVouchersQuery } from './list-product-vouchers.query';
import { ListProductVouchersQueryDto } from './list-product-vouchers.query.dto';

@Controller()
export class ListProductVouchersController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.vouchers.list')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: ListProductVouchersQueryDto,
  ): Promise<any> {
    const query = new ListProductVouchersQuery({
      identity,
      ...qs,
    });
    return this.queryBus.execute(query);
  }
}
