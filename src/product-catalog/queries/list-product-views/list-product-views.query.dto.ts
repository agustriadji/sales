import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class ListProductViewsQueryDto {
  @JoiSchema(joi.number().integer().optional())
  readonly category_id: string;
}
