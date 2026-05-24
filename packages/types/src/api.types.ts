export interface ApiResponse<T = null> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PaginationMetadata {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMetadata;
}
