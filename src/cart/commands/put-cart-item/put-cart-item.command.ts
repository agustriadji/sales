import { CorrelatableCommand } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

export class PutCartItemCommandProps {
  readonly identity: UserIdentity;
  readonly itemId: string;
  readonly baseQty: number;
  readonly packQty: number;
}

export class PutCartItemCommand extends CorrelatableCommand<PutCartItemCommandProps> {
  constructor(data: PutCartItemCommandProps) {
    super(data);
  }
}
