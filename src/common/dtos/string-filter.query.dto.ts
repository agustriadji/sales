import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class NumberFilterDto {
  @JoiSchema(Joi.number().positive().optional())
  readonly equals?: number;

  @JoiSchema(Joi.array().items(Joi.number().positive()).optional())
  readonly in?: number[];
}
