export type PaginationParams = {
  page: number;
  pageSize: number;
  offset: number;
};

export class PaginationUtil {
  public static getPaginationParams(
    page?: number,
    pageSize?: number,
  ): PaginationParams {
    const validatedPage = page && page > 0 ? page : 1;
    const validatedPageSize = pageSize && pageSize > 0 ? pageSize : 10;

    const offset = (validatedPage - 1) * validatedPageSize;

    return {
      page: validatedPage,
      pageSize: validatedPageSize,
      offset,
    };
  }
}
