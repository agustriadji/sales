export class GetProductIdByExternalIdResult {
  readonly data: {
    id: string;
  };

  constructor(id: string) {
    this.data = {
      id,
    };
  }
}
