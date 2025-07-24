import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class SuggestSearchProductsQueryDto {
  @JoiSchema(Joi.string().min(1).optional())
  readonly search: string;
}
