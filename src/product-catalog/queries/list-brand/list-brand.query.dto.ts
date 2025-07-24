import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class ListBrandQueryDto {
  @JoiSchema(joi.string().optional())
  readonly type?: string;
}
