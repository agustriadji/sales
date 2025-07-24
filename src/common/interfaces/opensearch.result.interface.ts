export interface OpensearchResult<T> {
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: HitsResult<T>[];
  };
}

interface HitsResult<T> {
  _index: string;
  _id: string;
  _score: number;
  _source: T;
}
