export interface IOpensearchReadRepository {
  spellCheck(search: string): Promise<string>;
}
