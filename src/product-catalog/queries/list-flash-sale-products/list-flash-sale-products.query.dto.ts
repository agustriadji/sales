import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import {
  PaginationQueryDto,
  ProductFilterQueryDto,
  ProductSortQueryDto,
} from '@wings-online/common';
import {
  FlashSaleStatus,
  FlashSaleStatusEnum,
} from '@wings-online/product-catalog/promotion';

export class ListFlashSaleProductsQueryDto extends PaginationQueryDto {
  @JoiSchema(ProductFilterQueryDto)
  readonly filter?: ProductFilterQueryDto;

  @JoiSchema(ProductSortQueryDto)
  readonly sort?: ProductSortQueryDto;

  @JoiSchema(
    joi
      .string()
      .valid(...Object.values(FlashSaleStatusEnum))
      .required(),
  )
  readonly status: FlashSaleStatus;
}
