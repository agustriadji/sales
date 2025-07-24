import { CorrelatableCommand } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class RenameWishlistCommandProps {
  readonly identity: UserIdentity;
  readonly id: string;
  readonly name: string;
}

export class RenameWishlistCommand extends CorrelatableCommand<RenameWishlistCommandProps> {
  constructor(props: RenameWishlistCommandProps) {
    super(props);
  }
}
