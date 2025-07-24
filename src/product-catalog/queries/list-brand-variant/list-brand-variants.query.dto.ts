import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class ListBrandVariantsQueryDto {
  @JoiSchema(joi.number().integer().required())
  readonly id: number;

  @JoiSchema(joi.string().uuid())
  readonly active_item_id?: string;
}
