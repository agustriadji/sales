import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { DEFAULT_QUERY_LIMIT, Identity } from '@wings-corporation/nest-http';
import {
  BuyerMustNotBeSuspendedInterceptor,
  UserIdentity,
} from '@wings-online/common';

import { ListCartItemsQuery } from './list-cart-items.query';
import { ListCartItemsQueryDto } from './list-cart-items.query.dto';

@UseInterceptors(BuyerMustNotBeSuspendedInterceptor)
@Controller()
export class ListCartItemsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/cart.items')
  async handler(
    @Query() qs: ListCartItemsQueryDto,
    @Identity() identity: UserIdentity,
  ): Promise<any> {
    try {
      console.log('Query Params:', qs);
      console.log('Identity:', identity);

      const query = new ListCartItemsQuery({
        identity,
        limit: qs.limit || DEFAULT_QUERY_LIMIT,
        cursor: qs.cursor,
        type: qs.type,
      });

      return await this.queryBus.execute(query);
    } catch (err) {
      console.error('Error in /cart.items handler:', err);
      throw err; // biarkan NestJS tangani atau custom filter
    }
  }
}
