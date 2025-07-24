import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Identity } from '@wings-corporation/nest-http';
import { UserIdentity } from '@wings-online/common';

import { GetProductByBarcodeQuery } from './get-product-by-barcode.query';
import { GetProductByBarcodeQueryDto } from './get-product-by-barcode.query.dto';

@Controller()
export class GetProductByBarcodeController {
  constructor(private readonly queryBus: QueryBus) {}

  @HttpCode(HttpStatus.OK)
  @Get('/products.by-barcode')
  async handler(
    @Identity() identity: UserIdentity,
    @Query() qs: GetProductByBarcodeQueryDto,
  ): Promise<any> {
    const query = new GetProductByBarcodeQuery({
      identity,
      ...qs,
    });
    return this.queryBus.execute(query);
  }
}
