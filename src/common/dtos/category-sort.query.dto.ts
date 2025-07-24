import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { SortDirection } from '../interfaces';

export class CategorySortQueryDto {
  @JoiSchema(Joi.string().valid('ASC', 'DESC').optional())
  readonly name?: SortDirection;

  @JoiSchema(Joi.string().valid('ASC', 'DESC').optional())
  readonly sequence?: SortDirection;
}
