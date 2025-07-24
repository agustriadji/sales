import { SuggestionBannerReadModel } from '@wings-online/banner/read-models';

export class GetSuggestionBannerResult {
  readonly data: SuggestionBannerReadModel;

  constructor(props: SuggestionBannerReadModel) {
    this.data = props;
  }
}
