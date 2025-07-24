import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class GetProductByBarcodeQueryDto {
  @JoiSchema(joi.string().required())
  readonly barcode: string;
}
