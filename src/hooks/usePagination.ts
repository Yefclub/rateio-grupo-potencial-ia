import { useState, useMemo } from "react";

interface UsePaginationProps<T> {
  data: T[];
  pageSize: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  pageData: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (size: number) => void;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

export const usePagination = <T>({
  data,
  pageSize: initialPageSize,
  initialPage = 1
}: UsePaginationProps<T>): UsePaginationReturn<T> => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ajustar página atual se ficou inválida após mudança de dados
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const pageData = useMemo(() => {
    return data.slice(startIndex, pageSize);
  }, [data, startIndex, pageSize]);

  const hasNextPage = validCurrentPage < totalPages;
  const hasPreviousPage = validCurrentPage > 1;

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(newPage);
  };

  const nextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const previousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    // Recalcular página atual para manter posição aproximada
    const currentItem = startIndex;
    const newPage = Math.floor(currentItem / size) + 1;
    setCurrentPage(newPage);
  };

  return {
    currentPage: validCurrentPage,
    totalPages,
    pageData,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    startIndex,
    endIndex,
    totalItems
  };
};
