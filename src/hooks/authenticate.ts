// src/hooks/authenticate.ts

import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { httpGet, HttpError } from '../utils/http-client.js';
import { sendError } from '../utils/response.js';
import type { AuthServiceMeResponse, AuthUser, Permission } from '../types/auth.types.js';

// ─── Token Extraction ──────────────────────────────────────────────────────

function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

// ─── Auth Service Call ─────────────────────────────────────────────────────

async function fetchUserFromAuthService(token: string): Promise<AuthUser> {
  const response = await httpGet<AuthServiceMeResponse>(env.AUTH_SERVICE_ME_ENDPOINT, {
    baseUrl: env.AUTH_SERVICE_BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ─── Hooks ─────────────────────────────────────────────────────────────────

/**
 * Validates the Bearer token and attaches the authenticated user to the request.
 * Must be used as a preHandler hook.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractBearerToken(request);

  if (!token) {
    return sendError({ reply, statusCode: 401, message: 'Authorization token is required' });
  }

  try {
    request.user = await fetchUserFromAuthService(token);
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.statusCode === 401) {
        return sendError({ reply, statusCode: 401, message: 'Invalid or expired token' });
      }
      return sendError({ reply, statusCode: err.statusCode, message: err.message });
    }
    return sendError({ reply, statusCode: 401, message: 'Token validation failed' });
  }
}

/**
 * Factory: returns a preHandler hook that checks if the authenticated user
 * has the required role (admin) AND the given permission.
 *
 * Always call after `authenticate`.
 */
export function requirePermission(permission: Permission) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { user } = request;

    const isAdmin = user.roles.includes('admin');
    const hasPermission = user.permissions.includes(permission);

    if (!isAdmin || !hasPermission) {
      return sendError({
        reply,
        statusCode: 403,
        message: 'You do not have permission to perform this action',
      });
    }
  };
}
