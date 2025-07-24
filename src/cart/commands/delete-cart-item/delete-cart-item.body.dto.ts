import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { Division, DivisionEnum } from '@wings-corporation/core';

export class DeleteCartItemBodyDto {
  @JoiSchema(joi.string().uuid().required())
  readonly item_id: string;

  @JoiSchema(
    joi
      .string()
      .valid(...Object.values(DivisionEnum))
      .required(),
  )
  readonly type: Division;
}
