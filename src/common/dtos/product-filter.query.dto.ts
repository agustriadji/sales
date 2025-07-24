import { JoiSchema } from 'joi-class-decorators';

import { StringFilterDto } from './number-filter.query.dto';
import { NumberFilterDto } from './string-filter.query.dto';
import { StringOrNumberFilterDto } from './string-or-number.filter.query.dto';

export class ProductFilterQueryDto {
  @JoiSchema(NumberFilterDto)
  readonly brandId?: NumberFilterDto;

  @JoiSchema(StringFilterDto)
  readonly variant?: StringFilterDto;

  @JoiSchema(StringOrNumberFilterDto)
  readonly packSize?: StringOrNumberFilterDto<string>;

  // example: het:in(0-1000|1000-2000|2000-) or het:eql(1000-)
  @JoiSchema(StringFilterDto)
  readonly het?: StringFilterDto;

  @JoiSchema(StringFilterDto)
  readonly label?: StringFilterDto;

  @JoiSchema(NumberFilterDto)
  readonly categoryId?: NumberFilterDto;
}
