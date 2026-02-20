export type ApiResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  path?: string;
  timestamp?: string;
  data: T;
};
