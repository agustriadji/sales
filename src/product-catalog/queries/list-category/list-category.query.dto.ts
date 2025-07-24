import { JoiSchema } from 'joi-class-decorators';

import { CategorySortQueryDto } from '@wings-online/common';

export class ListCategoryQueryDto {
  @JoiSchema(CategorySortQueryDto)
  readonly sort?: CategorySortQueryDto;
}
