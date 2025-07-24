import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class CheckoutCartBodyDto {
  @JoiSchema(joi.date().optional())
  readonly dry_delivery_date: Date;

  @JoiSchema(joi.date().optional())
  readonly frozen_delivery_date: Date;

  @JoiSchema(joi.number().min(-90).max(90).required())
  readonly latitude: number;

  @JoiSchema(joi.number().min(-180).max(180).required())
  readonly longitude: number;

  @JoiSchema(joi.boolean().optional().default(false))
  readonly is_simulate_price: boolean;
}
