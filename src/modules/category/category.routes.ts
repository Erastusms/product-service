// src/modules/category/category.routes.ts

import type { FastifyInstance } from 'fastify';
import { CategoryRepository } from './category.repository.js';
import { CategoryService } from './category.service.js';
import { CategoryController } from './category.controller.js';
import { authenticate, requirePermission } from '../../hooks/authenticate.js';

export async function categoryRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── Wire dependencies ───────────────────────────────────────────────
  const repository = new CategoryRepository(fastify.prisma);
  const service = new CategoryService(repository);
  const controller = new CategoryController(service);

  // ─── Shared auth preHandlers ─────────────────────────────────────────
  const writeGuard = [authenticate, requirePermission('categories:write')];
  const deleteGuard = [authenticate, requirePermission('categories:delete')];

  // ─── Public routes ───────────────────────────────────────────────────

  // GET /categories
  fastify.get('/', {
    handler: controller.getAll,
  });

  // GET /categories/:id
  fastify.get('/:id', {
    handler: controller.getById,
  });

  // ─── Protected routes ────────────────────────────────────────────────

  // POST /categories
  fastify.post('/', {
    preHandler: writeGuard,
    handler: controller.create,
  });

  // PATCH /categories/:id
  fastify.patch('/:id', {
    preHandler: writeGuard,
    handler: controller.update,
  });

  // DELETE /categories/:id
  fastify.delete('/:id', {
    preHandler: deleteGuard,
    handler: controller.delete,
  });
}
