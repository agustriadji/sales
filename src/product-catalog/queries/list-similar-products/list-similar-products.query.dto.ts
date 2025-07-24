import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import {
  PaginationQueryDto,
  ProductFilterQueryDto,
  ProductSortQueryDto,
} from '@wings-online/common';

export class ListSimilarProductsQueryDto extends PaginationQueryDto {
  @JoiSchema(joi.number().integer().positive().optional())
  readonly category_id?: number;

  @JoiSchema(ProductFilterQueryDto)
  readonly filter?: ProductFilterQueryDto;

  @JoiSchema(ProductSortQueryDto)
  readonly sort?: ProductSortQueryDto;
}
