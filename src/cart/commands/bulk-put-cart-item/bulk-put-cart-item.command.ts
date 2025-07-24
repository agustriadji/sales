import { CorrelatableCommand } from '@wings-corporation/core';
import { UserIdentity } from '@wings-online/common';

interface Props {
  itemId: string;
  baseQty: number;
  packQty: number;
}

export class BulkPutCartItemCommandProps {
  readonly identity: UserIdentity;
  readonly items: Props[];
}

export class BulkPutCartItemCommand extends CorrelatableCommand<BulkPutCartItemCommandProps> {
  constructor(data: BulkPutCartItemCommandProps) {
    super(data);
  }
}
