import { CorrelatableCommand } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class DeleteWishlistCommandProps {
  readonly identity: UserIdentity;
  readonly id: string;
}

export class DeleteWishlistCommand extends CorrelatableCommand<DeleteWishlistCommandProps> {
  constructor(props: DeleteWishlistCommandProps) {
    super(props);
  }
}
