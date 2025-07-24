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
import { HttpCacheInterceptor, UserIdentity } from '@wings-online/common';

import { GetProductIdByExternalIdQuery } from './get-product-id-by-external-id.query';
import { GetProductIdByExternalIdQueryDto } from './get-product-id-by-external-id.query.dto';

@UseInterceptors(HttpCacheInterceptor)
@Controller()
export class GetProductIdByExternalIdController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.id.by-external-id')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: GetProductIdByExternalIdQueryDto,
  ): Promise<any> {
    const query = new GetProductIdByExternalIdQuery({
      identity,
      externalId: qs.external_id,
    });
    return this.queryBus.execute(query);
  }
}
