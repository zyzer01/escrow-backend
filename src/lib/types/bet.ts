export interface BetPaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  total: number;
}

export interface BetQueryParams {
    query?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    status?: string;
    betType?: string;
    deadline?: string;
  }
