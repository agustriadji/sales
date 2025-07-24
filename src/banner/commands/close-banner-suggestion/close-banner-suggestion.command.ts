import { CorrelatableCommand, Division } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class CloseBannerSuggestionCommandProps {
  readonly identity: UserIdentity;
  readonly type: Division;
}

export class CloseBannerSuggestionCommand extends CorrelatableCommand<CloseBannerSuggestionCommandProps> {
  constructor(data: CloseBannerSuggestionCommandProps) {
    super(data);
  }
}
