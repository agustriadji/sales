import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { GetProductFilterBodyDto } from './get-product-filter.body.dto';
import { GetProductFilterQuery } from './get-product-filter.query';

@Controller()
export class GetProductFilterController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Post('/products.filter')
  async handler(
    @Identity() identity: UserIdentity,
    @Body() body: GetProductFilterBodyDto,
  ): Promise<any> {
    const query = new GetProductFilterQuery({
      identity,
      categoryId: body.category_id,
      search: body.search,
      isNew: body.is_new,
      isBestSeller: body.is_best_seller,
      isLowStock: body.is_low_stock,
      isSelected: body.is_selected,
      isFrequentlyPurchased: body.is_frequently_purchased,
      isSimilar: body.is_similar,
      conditions: body.conditions || [],
      isTprPromo: body.is_tpr_promo,
      isActiveFlashSale: body.is_active_flash_sale,
      isUpcomingFlashSale: body.is_upcoming_flash_sale,
    });
    return this.queryBus.execute(query);
  }
}
