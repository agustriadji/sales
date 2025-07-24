import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class PutCartItemBodyDto {
  @JoiSchema(joi.string().uuid().required())
  readonly item_id: string;

  @JoiSchema(joi.number().min(0).required())
  readonly base_qty: number;

  @JoiSchema(joi.number().min(0).required())
  readonly pack_qty: number;
}
