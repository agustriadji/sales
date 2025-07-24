import { IQuery } from '@nestjs/cqrs';
import { UserIdentity } from '@wings-online/common';

export class GetSuggestionBannerProps {
  readonly identity: UserIdentity;
}

export class GetSuggestionBannerQuery
  extends GetSuggestionBannerProps
  implements IQuery
{
  constructor(props: GetSuggestionBannerProps) {
    super();
    Object.assign(this, props);
  }
}
