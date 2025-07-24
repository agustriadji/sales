import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { CategoryTypes } from '@wings-online/product-catalog/product-catalog.constants';

export class SearchBrandsQueryDto {
  @JoiSchema(Joi.string().min(1).required())
  readonly search: string;

  @JoiSchema(
    Joi.string()
      .valid(...Object.values(CategoryTypes))
      .optional(),
  )
  readonly type?: CategoryTypes;

  @JoiSchema(Joi.number().min(1).optional())
  readonly limit?: number;
}
