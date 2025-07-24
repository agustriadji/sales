import { JoiSchema } from 'joi-class-decorators';

import { PaginationQueryDto, StringFilterDto } from '@wings-online/common';

export class ListBannerFilterQueryDto {
  @JoiSchema(StringFilterDto)
  readonly pageName?: StringFilterDto;

  @JoiSchema(StringFilterDto)
  readonly type?: StringFilterDto;
}

export class ListBannersQueryDto extends PaginationQueryDto {
  @JoiSchema(ListBannerFilterQueryDto)
  readonly filter?: ListBannerFilterQueryDto;
}
