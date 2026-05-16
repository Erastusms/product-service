// src/utils/response.ts

import type { FastifyReply } from 'fastify';

interface SuccessOptions<T> {
  reply: FastifyReply;
  statusCode?: number;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;
}

interface ErrorOptions {
  reply: FastifyReply;
  statusCode?: number;
  message: string;
  errors?: unknown;
}

export function sendSuccess<T>({
  reply,
  statusCode = 200,
  message,
  data,
  meta,
}: SuccessOptions<T>) {
  return reply.status(statusCode).send({
    success: true,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  });
}

export function sendError({ reply, statusCode = 500, message, errors }: ErrorOptions) {
  return reply.status(statusCode).send({
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  });
}
