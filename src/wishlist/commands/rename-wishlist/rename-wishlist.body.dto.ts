import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class RenameWishlistBodyDto {
  @JoiSchema(joi.string().uuid().required())
  readonly id: string;

  @JoiSchema(joi.string().min(1).max(50).required())
  readonly name: string;
}
