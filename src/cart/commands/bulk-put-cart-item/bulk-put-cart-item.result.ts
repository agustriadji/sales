import { DomainEvent } from '@wings-corporation/domain';

type Props = {
  item_id: string;
  result: string;
};
export type BulkPutCartItemResultProps = { itemId: string; result: string };
export type JsonBulkPutCartItemResultProps = {
  data: Array<Props>;
};

export class BulkPutCartItemResult {
  constructor(
    readonly result: Array<BulkPutCartItemResultProps>,
    readonly events: DomainEvent<any>[],
  ) {}

  toJSON(): JsonBulkPutCartItemResultProps {
    return {
      data: this.result.map(this.serialize),
    };
  }

  serialize(props: BulkPutCartItemResultProps): Props {
    return {
      item_id: props.itemId,
      result: props.result,
    };
  }
}
