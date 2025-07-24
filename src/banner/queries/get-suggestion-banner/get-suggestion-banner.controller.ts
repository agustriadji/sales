import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { GetSuggestionBannerQuery } from './get-suggestion-banner.query';

@Controller()
export class GetSuggestionBannerController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/banners.suggestion')
  async handler(@Identity() identity: UserIdentity): Promise<any> {
    const query = new GetSuggestionBannerQuery({ identity });
    return this.queryBus.execute(query);
  }
}
