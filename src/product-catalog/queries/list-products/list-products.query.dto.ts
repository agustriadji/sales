import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import {
  PaginationQueryDto,
  ProductFilterQueryDto,
  ProductSortQueryDto,
} from '@wings-online/common';

export class ListProductsQueryDto extends PaginationQueryDto {
  @JoiSchema(ProductFilterQueryDto)
  readonly filter?: ProductFilterQueryDto;

  @JoiSchema(ProductSortQueryDto)
  readonly sort?: ProductSortQueryDto;

  @JoiSchema(Joi.string().min(1).optional())
  readonly search?: string;

  @JoiSchema(Joi.boolean().optional())
  readonly exclude_inside_cart?: boolean;
}
