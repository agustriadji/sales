import { IQuery } from '@nestjs/cqrs';

export class SuggestSearchProductsQueryProps {
  readonly search: string;
}

export class SuggestSearchProductsQuery
  extends SuggestSearchProductsQueryProps
  implements IQuery
{
  constructor(props: SuggestSearchProductsQueryProps) {
    super();
    Object.assign(this, props);
  }
}
