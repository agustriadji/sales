import { JoiSchema } from 'joi-class-decorators';

import {
  PaginationQueryDto,
  ProductFilterQueryDto,
  ProductSortQueryDto,
} from '@wings-online/common';

export class ListSelectedProductsQueryDto extends PaginationQueryDto {
  @JoiSchema(ProductFilterQueryDto)
  readonly filter?: ProductFilterQueryDto;

  @JoiSchema(ProductSortQueryDto)
  readonly sort?: ProductSortQueryDto;
}
