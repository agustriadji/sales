import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

import { Condition } from '@wings-online/product-catalog/interfaces';

export class GetProductFilterBodyDto {
  @JoiSchema(joi.number().integer().optional())
  readonly category_id?: number;

  @JoiSchema(joi.string().min(1).optional())
  readonly search?: string;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_new?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_best_seller?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_low_stock?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_selected?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_frequently_purchased?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_similar?: true;

  @JoiSchema(joi.array())
  readonly conditions?: Array<Condition>;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_tpr_promo?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_active_flash_sale?: true;

  @JoiSchema(joi.boolean().valid(true).optional())
  readonly is_upcoming_flash_sale?: true;
}
