import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListVideoQuery } from './list-video.query';

@Controller()
export class ListVideoController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/videos.list')
  async handler(@Identity() identity: UserIdentity): Promise<any> {
    const query = new ListVideoQuery({ identity });
    return this.queryBus.execute(query);
  }
}
