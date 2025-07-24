import * as joi from 'joi';
import { getClassSchema, JoiSchema } from 'joi-class-decorators';

class BulkPutCartItemProps {
  @JoiSchema(joi.string().uuid().required())
  readonly item_id: string;

  @JoiSchema(joi.number().min(0).required())
  readonly base_qty: number;

  @JoiSchema(joi.number().min(0).required())
  readonly pack_qty: number;
}

export class BulkPutCartItemBodyDto {
  @JoiSchema(
    joi.array().items(getClassSchema(BulkPutCartItemProps)).min(1).required(),
  )
  readonly items: BulkPutCartItemProps[];
}
