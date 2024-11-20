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
