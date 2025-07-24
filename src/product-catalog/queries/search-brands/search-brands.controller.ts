import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { SearchBrandsQuery } from './search-brands.query';
import { SearchBrandsQueryDto } from './search-brands.query.dto';

@Controller()
export class SearchBrandsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/brands.search')
  async handler(
    @Query() qs: SearchBrandsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    const query = new SearchBrandsQuery({
      ...qs,
      identity,
    });
    return this.queryBus.execute(query);
  }
}
