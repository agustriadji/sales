import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { RecommendationFilter } from '@wings-online/product-catalog/product-catalog.constants';

export class HETRangeDTO {
  from: number;
  to?: number;
}

export class GetFilterQueryDto {
  @JoiSchema(joi.number().integer().optional())
  readonly category_id?: number;

  @JoiSchema(joi.array().items(joi.number().integer()).single().optional())
  readonly brand_id?: Array<number>;

  @JoiSchema(joi.array().items(joi.string()).single().optional())
  readonly variant?: Array<string>;

  @JoiSchema(
    joi
      .array()
      .items(joi.string().regex(/^\d+(-\d+)?$/))
      .single()
      .optional(),
  )
  readonly het_range?: Array<string>;

  @JoiSchema(joi.array().items(joi.string()).single().optional())
  readonly pack_size?: Array<string>;

  @JoiSchema(
    joi
      .string()
      .valid(...Object.values(RecommendationFilter))
      .optional(),
  )
  readonly recommendation?: RecommendationFilter;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_best_seller?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_low_stock?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_new?: true;

  @JoiSchema(joi.string().min(1).optional())
  readonly search?: string;
}
