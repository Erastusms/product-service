// src/modules/product/product.routes.ts

import type { FastifyInstance } from 'fastify';
import { ProductRepository } from './product.repository.js';
import { ProductService } from './product.service.js';
import { ProductController } from './product.controller.js';
import { authenticate, requirePermission } from '../../hooks/authenticate.js';

export async function productRoutes(fastify: FastifyInstance): Promise<void> {
  // ─── Wire dependencies ───────────────────────────────────────────────
  const repository = new ProductRepository(fastify.prisma);
  const service = new ProductService(repository);
  const controller = new ProductController(service);

  // ─── Shared auth preHandlers ─────────────────────────────────────────
  const writeGuard = [authenticate, requirePermission('products:write')];
  const deleteGuard = [authenticate, requirePermission('products:delete')];

  // ─── Public routes ───────────────────────────────────────────────────

  // GET /products
  fastify.get('/', {
    handler: controller.getAll,
  });

  // GET /products/:id
  fastify.get('/:id', {
    handler: controller.getById,
  });

  // ─── Protected routes ────────────────────────────────────────────────

  // POST /products
  fastify.post('/', {
    preHandler: writeGuard,
    handler: controller.create,
  });

  // PATCH /products/:id
  fastify.patch('/:id', {
    preHandler: writeGuard,
    handler: controller.update,
  });

  // DELETE /products/:id
  fastify.delete('/:id', {
    preHandler: deleteGuard,
    handler: controller.delete,
  });
}
