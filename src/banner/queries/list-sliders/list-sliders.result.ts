import {
  PaginatedCollection,
  PaginatedQueryResult,
} from '@wings-corporation/core';
import {
  BannerReadModel,
  JsonBannerProps,
} from '@wings-online/banner/read-models';

export class ListSlidersResult extends PaginatedQueryResult<BannerReadModel> {
  readonly data: JsonBannerProps[];

  constructor(props: PaginatedCollection<BannerReadModel>) {
    super(props);
    this.data = props.data.map((x) => x.toJSON());
  }
}
