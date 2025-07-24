import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class StringOrNumberFilterDto<T extends string | number> {
  @JoiSchema(
    Joi.alternatives().try(Joi.number().positive(), Joi.string()).optional(),
  )
  readonly equals?: T;

  @JoiSchema(
    Joi.array()
      .items(Joi.alternatives().try(Joi.number().positive(), Joi.string()))
      .optional(),
  )
  readonly in?: Array<T>;
}
