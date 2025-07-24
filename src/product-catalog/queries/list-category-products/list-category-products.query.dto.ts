import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import {
  PaginationQueryDto,
  ProductFilterQueryDto,
  ProductSortQueryDto,
} from '@wings-online/common';

export class ListCategoryProductsQueryDto extends PaginationQueryDto {
  @JoiSchema(joi.number().integer().required())
  readonly category_id: string;

  @JoiSchema(ProductFilterQueryDto)
  readonly filter?: ProductFilterQueryDto;

  @JoiSchema(ProductSortQueryDto)
  readonly sort?: ProductSortQueryDto;
}
