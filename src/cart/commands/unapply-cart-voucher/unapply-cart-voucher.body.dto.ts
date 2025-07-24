import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { Division, DivisionEnum } from '@wings-corporation/core';

export class UnapplyCartVoucherBodyDto {
  @JoiSchema(joi.array().items(joi.string().min(1)).min(1).required())
  readonly voucher_ids: string[];

  @JoiSchema(
    joi
      .string()
      .valid(...Object.values(DivisionEnum))
      .required(),
  )
  readonly type: Division;
}
