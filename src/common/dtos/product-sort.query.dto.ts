import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { SortDirection } from '../interfaces';

export class ProductSortQueryDto {
  @JoiSchema(Joi.string().valid('ASC', 'DESC').optional())
  readonly name?: SortDirection;

  @JoiSchema(Joi.string().valid('ASC', 'DESC').optional())
  readonly price?: SortDirection;

  @JoiSchema(Joi.string().valid('ASC', 'DESC').optional())
  readonly weight?: SortDirection;

  @JoiSchema(Joi.string().valid('ASC', 'DESC').optional())
  readonly sequence?: SortDirection;

  @JoiSchema(Joi.string().valid('ASC').optional())
  readonly wishlist?: SortDirection;
}
