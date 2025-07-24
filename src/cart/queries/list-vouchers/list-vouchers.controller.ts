import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListVouchersQuery } from './list-vouchers.query';

@Controller()
export class ListVouchersController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/vouchers.list')
  async handler(@Identity() identity: UserIdentity): Promise<any> {
    const query = new ListVouchersQuery({
      identity,
    });
    return this.queryBus.execute(query);
  }
}
