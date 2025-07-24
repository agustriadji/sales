import * as Joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class PaginationQueryDto {
  @JoiSchema(Joi.number().integer().positive().optional().default(1))
  readonly page?: number;

  @JoiSchema(
    Joi.number().integer().positive().optional().default(10).label('page_size'),
  )
  readonly page_size?: number;
}
