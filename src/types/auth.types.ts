// src/types/auth.types.ts

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
}

export interface AuthServiceMeResponse {
  success: boolean;
  data: AuthUser;
}

export type Permission = 'products:write' | 'products:delete';
export type Role = 'admin' | 'member';

// Extend FastifyRequest to carry the authenticated user
declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}
