import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class ListProductVouchersQueryDto {
  @JoiSchema(joi.string().uuid().required())
  readonly id: string;
}
