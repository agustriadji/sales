export abstract class BaseReadRepository {
  protected decodeCursor<T>(cursor: string): T | undefined {
    let value: T | undefined;
    try {
      const decodedString = Buffer.from(cursor, 'base64').toString('ascii');
      value = JSON.parse(decodedString);
    } catch (err) {}
    return value as T;
  }

  protected encodeCursor<T = any>(props: T) {
    const value = JSON.stringify(props);
    return Buffer.from(value).toString('base64');
  }
}
