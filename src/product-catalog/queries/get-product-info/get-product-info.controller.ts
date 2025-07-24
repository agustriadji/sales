import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';
import { HttpCacheInterceptor } from '@wings-online/common/interceptors';

import { GetProductInfoQuery } from './get-product-info.query';
import { GetProductInfoQueryDto } from './get-product-info.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class GetProductInfoController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.info')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: GetProductInfoQueryDto,
  ): Promise<any> {
    const query = new GetProductInfoQuery({
      identity,
      ...qs,
    });
    return this.queryBus.execute(query);
  }
}
