import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class SearchProductsQueryDto {
  @JoiSchema(Joi.string().min(1).optional())
  readonly search: string;

  @JoiSchema(Joi.number().integer().positive().optional())
  readonly category_id?: number;

  @JoiSchema(Joi.number().min(1).optional())
  readonly limit?: number;
}
