export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errors = {
  unauthorized: (msg = 'Non authentifié') => new ApiError(401, msg, 'UNAUTHORIZED'),
  forbidden: (msg = 'Accès refusé') => new ApiError(403, msg, 'FORBIDDEN'),
  notFound: (msg = 'Introuvable') => new ApiError(404, msg, 'NOT_FOUND'),
  conflict: (msg: string) => new ApiError(409, msg, 'CONFLICT'),
  badRequest: (msg: string, details?: unknown) => new ApiError(400, msg, 'BAD_REQUEST', details),
};