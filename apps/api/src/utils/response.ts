import type { Response } from "express";
import type { ApiResponse } from "@antigravity/types";

export function sendSuccess<T = null>(
  res: Response,
  data: T | null = null,
  statusCode = 200,
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };
  return res.status(statusCode).json(response);
}

export function sendError(res: Response, errorMessage: string, statusCode = 500): Response {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error: errorMessage,
  };
  return res.status(statusCode).json(response);
}
