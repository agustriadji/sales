import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class CreateWishlistBodyDto {
  @JoiSchema(joi.string().min(1).max(50).required())
  readonly name: string;
}
