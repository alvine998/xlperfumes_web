"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type ApiPaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  itemLabel: string;
  pageSizes?: readonly number[];
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export function ApiPagination({
  page,
  limit,
  total,
  totalPages,
  itemLabel,
  pageSizes = [25, 50, 100],
  isLoading = false,
  onPageChange,
  onLimitChange,
}: ApiPaginationProps) {
  const pageCount = Math.max(1, totalPages);
  const currentPage = Math.min(page, pageCount);
  const start = total ? (currentPage - 1) * limit + 1 : 0;
  const end = Math.min(currentPage * limit, total);

  return (
    <nav className="api-pagination" aria-label={`Navigasi halaman ${itemLabel}`}>
      <span className="api-pagination-summary">
        Menampilkan <strong>{start}–{end}</strong> dari <strong>{total}</strong> {itemLabel}
      </span>
      <div className="api-pagination-controls">
        <label className="api-pagination-size">
          Baris per halaman
          <select
            aria-label={`Baris ${itemLabel} per halaman`}
            value={limit}
            disabled={isLoading}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <div className="api-pagination-nav">
          <span>Halaman {currentPage} dari {pageCount}</span>
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={currentPage <= 1 || isLoading}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Halaman berikutnya"
            disabled={currentPage >= pageCount || isLoading}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </nav>
  );
}
