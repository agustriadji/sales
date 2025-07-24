import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListSlidersQuery } from './list-sliders.query';

@Controller()
export class ListSlidersController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/sliders.list')
  async handler(@Identity() identity: UserIdentity): Promise<any> {
    const query = new ListSlidersQuery({
      identity,
    });
    return this.queryBus.execute(query);
  }
}
