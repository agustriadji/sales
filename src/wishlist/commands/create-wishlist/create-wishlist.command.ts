import { CorrelatableCommand } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class CreateWishlistCommandProps {
  readonly identity: UserIdentity;
  readonly name: string;
}

export class CreateWishlistCommand extends CorrelatableCommand<CreateWishlistCommandProps> {
  constructor(props: CreateWishlistCommandProps) {
    super(props);
  }
}
