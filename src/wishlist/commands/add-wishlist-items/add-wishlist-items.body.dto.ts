import * as joi from 'joi';
import { JoiSchema } from 'joi-class-decorators';

export class AddWishlistItemsBodyDto {
  @JoiSchema(joi.string().uuid().optional())
  readonly wishlist_id: string;

  @JoiSchema(joi.array().items(joi.string().uuid()).min(1).required())
  readonly item_ids: string[];
}
