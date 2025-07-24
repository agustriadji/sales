import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { Division, DivisionEnum } from '@wings-corporation/core';
import { CursorPaginationQueryDto } from '@wings-corporation/nest-http';

export class ListCartItemsQueryDto extends CursorPaginationQueryDto {
  @JoiSchema(
    joi
      .string()
      .valid(...Object.values(DivisionEnum))
      .required(),
  )
  readonly type: Division;
}
