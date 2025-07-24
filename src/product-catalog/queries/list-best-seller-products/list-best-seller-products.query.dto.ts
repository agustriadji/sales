import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { CursorPaginationQueryDto } from '@wings-corporation/nest-http';

export class ListBestSellerProductsQueryDto extends CursorPaginationQueryDto {
  @JoiSchema(joi.number().integer().optional())
  readonly category_id: string;
}
