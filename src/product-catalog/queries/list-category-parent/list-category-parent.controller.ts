import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { ListCategoryParentQuery } from './list-category-parent.query';

@Controller()
export class ListCategoryParentController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/categories.parents.list')
  async handler(@Identity() identity: UserIdentity): Promise<any> {
    const query = new ListCategoryParentQuery({ identity });
    return this.queryBus.execute(query);
  }
}
