import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class StringFilterDto {
  @JoiSchema(Joi.string().trim().optional())
  equals?: string;

  @JoiSchema(Joi.array().items(Joi.string().trim()).optional())
  in?: string[];
}
