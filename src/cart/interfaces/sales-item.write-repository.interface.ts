import {
  SalesItemModel,
  SalesItemUomReadModel,
} from '@wings-online/cart/domains';
import { UserIdentity } from '@wings-online/common';

export interface ISalesItemWriteRepository {
  /**
   *
   * @param itemId
   * @param identity
   *
   */
  getSalesItem(
    itemId: string,
    identity: UserIdentity,
  ): Promise<SalesItemModel | undefined>;
  /**
   *
   * @param itemIds
   * @param identity
   *
   */
  getSalesItems(
    itemIds: string[],
    identity: UserIdentity,
  ): Promise<SalesItemModel[]>;
  /**
   *
   * @param itemIds
   * @param identity
   *
   */
  getItemsUoms(
    itemIds: string[],
    identity: UserIdentity,
  ): Promise<SalesItemUomReadModel[]>;
}
