import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class RemoveWishlistItemBodyDto {
  @JoiSchema(joi.string().uuid().optional())
  readonly wishlist_id: string;

  @JoiSchema(joi.string().uuid().required())
  readonly item_id: string;
}
