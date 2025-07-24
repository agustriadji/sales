import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { SuggestSearchProductsQuery } from './suggest-search-products.query';
import { SuggestSearchProductsQueryDto } from './suggest-search-products.query.dto';

@Controller()
export class SuggestSearchProductsController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.search.suggest')
  async handler(@Query() qs: SuggestSearchProductsQueryDto): Promise<any> {
    const query = new SuggestSearchProductsQuery({
      ...qs,
    });
    return this.queryBus.execute(query);
  }
}
