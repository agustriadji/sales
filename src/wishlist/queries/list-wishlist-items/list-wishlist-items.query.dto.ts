import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { PaginationQueryDto } from '@wings-online/common';

export class ListWishlistItemsQueryDto extends PaginationQueryDto {
  @JoiSchema(joi.string().uuid().required())
  readonly id: string;
}
