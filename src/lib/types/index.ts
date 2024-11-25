export interface PaginatedResponse<T> {
    items: T[];
    hasMore: boolean;
    total: number;
}
