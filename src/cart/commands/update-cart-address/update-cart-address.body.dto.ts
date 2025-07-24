import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { Division, DivisionEnum } from '@wings-corporation/core';

export class UpdateCartAddressBodyDto {
  @JoiSchema(joi.string().uuid().required())
  readonly delivery_address_id: string;

  @JoiSchema(
    joi
      .string()
      .valid(...Object.values(DivisionEnum))
      .required(),
  )
  readonly type: Division;
}
