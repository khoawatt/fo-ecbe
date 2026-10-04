import { PageResult } from './page-result';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export type PaginatedApiResponse<T> = ApiResponse<PageResult<T>>;
