import { getApi } from "@/lib/api";

export type ApiPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isApiPagination(value: unknown): value is ApiPagination {
  return isRecord(value) &&
    typeof value.page === "number" && Number.isInteger(value.page) && value.page >= 1 &&
    typeof value.limit === "number" && Number.isInteger(value.limit) && value.limit >= 1 &&
    typeof value.total === "number" && Number.isInteger(value.total) && value.total >= 0 &&
    typeof value.totalPages === "number" && Number.isInteger(value.totalPages) && value.totalPages >= 0;
}

export async function getAllApiPages<T>(
  path: string,
  collectionKey: string,
  isItem: (value: unknown) => value is T,
  pageSize = 100,
  maxItems?: number,
): Promise<T[]> {
  const [pathname, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    const { data } = await getApi(`${pathname}?${params.toString()}`);
    if (!isRecord(data) || !Array.isArray(data[collectionKey]) || !isApiPagination(data.pagination)) {
      throw new Error("API returned an invalid paginated list.");
    }
    for (const item of data[collectionKey]) {
      if (!isItem(item)) throw new Error("API returned an invalid paginated list.");
      items.push(item);
    }
    totalPages = maxItems === undefined
      ? data.pagination.totalPages
      : Math.min(data.pagination.totalPages, Math.ceil(maxItems / pageSize));
    page += 1;
  } while (page <= totalPages);

  return maxItems === undefined ? items : items.slice(0, maxItems);
}
