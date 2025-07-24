import { EntityId, Quantity } from '@wings-corporation/domain';
import { PackQty } from '@wings-online/cart/domains';
import {
  BaseReadModelMapper,
  ISalesUom,
  SalesTier,
  SalesUtil,
} from '@wings-online/common';

import { TypeOrmItemEntity } from '../entities';
import { PRODUCT_DEFAULT_BASE_UOM } from '../product-catalog.constants';
import { VariantReadModel } from '../read-models';

export class VariantMapper extends BaseReadModelMapper<
  TypeOrmItemEntity,
  VariantReadModel
> {
  toReadModel(data: TypeOrmItemEntity): VariantReadModel {
    const uoms: ISalesUom[] = data.uoms.map((x) => ({
      tier: SalesTier.create(x.tier),
      name: x.uom,
      qty: PackQty.create(x.packQty),
    }));
    const baseUom = SalesUtil.getEffectiveBaseUom(
      data.baseUom || PRODUCT_DEFAULT_BASE_UOM,
      uoms,
    );

    return new VariantReadModel({
      itemId: EntityId.fromString(data.id),
      baseUom: baseUom.name,
      baseQty: Quantity.create(baseUom.qty.value),
      packUom: data.packUom,
      packQty:
        data.packUom && data.packQty
          ? Quantity.create(data.packQty)
          : undefined,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      variant: data.info.variant!,
      imageUrl: data.info.imageUrl,
      tags: data.salesConfigs[0]?.tags || [],
    });
  }
}
