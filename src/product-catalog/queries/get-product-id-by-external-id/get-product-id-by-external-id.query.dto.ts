import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class GetProductIdByExternalIdQueryDto {
  @JoiSchema(joi.number().integer().required())
  readonly external_id: string;
}
