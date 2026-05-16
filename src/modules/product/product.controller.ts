// src/modules/product/product.controller.ts

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import {
  createProductSchema,
  updateProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type GetProductsQuery,
} from './product.schema.js';
import type { ProductService } from './product.service.js';
import { ProductNotFoundError, ProductConflictError } from './product.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatZodErrors(error: ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}

// ─── Controller ────────────────────────────────────────────────────────────

export class ProductController {
  constructor(private readonly service: ProductService) {}

  // GET /products
  getAll = async (
    request: FastifyRequest<{ Querystring: GetProductsQuery }>,
    reply: FastifyReply,
  ) => {
    const parsed = getProductsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid query parameters',
        errors: formatZodErrors(parsed.error),
      });
    }

    const { products, meta } = await this.service.getAll(parsed.data);

    return sendSuccess({ reply, message: 'Products retrieved successfully', data: products, meta });
  };

  // GET /products/:id
  getById = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = productIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid product ID',
        errors: formatZodErrors(parsed.error),
      });
    }

    try {
      const product = await this.service.getById(parsed.data.id);
      return sendSuccess({ reply, message: 'Product retrieved successfully', data: product });
    } catch (err) {
      if (err instanceof ProductNotFoundError) {
        return sendError({ reply, statusCode: 404, message: err.message });
      }
      throw err;
    }
  };

  // POST /products
  create = async (
    request: FastifyRequest<{ Body: CreateProductInput }>,
    reply: FastifyReply,
  ) => {
    const parsed = createProductSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Validation failed',
        errors: formatZodErrors(parsed.error),
      });
    }

    try {
      const product = await this.service.create(parsed.data, request.user.id);
      return sendSuccess({ reply, statusCode: 201, message: 'Product created successfully', data: product });
    } catch (err) {
      if (err instanceof ProductConflictError) {
        return sendError({ reply, statusCode: 409, message: err.message });
      }
      throw err;
    }
  };

  // PATCH /products/:id
  update = async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductInput }>,
    reply: FastifyReply,
  ) => {
    const paramParsed = productIdParamSchema.safeParse(request.params);
    if (!paramParsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid product ID',
        errors: formatZodErrors(paramParsed.error),
      });
    }

    const bodyParsed = updateProductSchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Validation failed',
        errors: formatZodErrors(bodyParsed.error),
      });
    }

    try {
      const product = await this.service.update(paramParsed.data.id, bodyParsed.data, request.user.id);
      return sendSuccess({ reply, message: 'Product updated successfully', data: product });
    } catch (err) {
      if (err instanceof ProductNotFoundError) {
        return sendError({ reply, statusCode: 404, message: err.message });
      }
      if (err instanceof ProductConflictError) {
        return sendError({ reply, statusCode: 409, message: err.message });
      }
      throw err;
    }
  };

  // DELETE /products/:id
  delete = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const parsed = productIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid product ID',
        errors: formatZodErrors(parsed.error),
      });
    }

    try {
      await this.service.delete(parsed.data.id, request.user.id);
      return sendSuccess({ reply, message: 'Product deleted successfully' });
    } catch (err) {
      if (err instanceof ProductNotFoundError) {
        return sendError({ reply, statusCode: 404, message: err.message });
      }
      throw err;
    }
  };
}
