// src/modules/category/category.controller.ts

import type { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategoriesQuerySchema,
  categoryIdParamSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type GetCategoriesQuery,
} from './category.schema.js';
import type { CategoryService } from './category.service.js';
import {
  CategoryNotFoundError,
  CategoryConflictError,
  CategoryHasChildrenError,
} from './category.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatZodErrors(error: ZodError) {
  return error.errors.map((e) => ({
    field: e.path.join('.'),
    message: e.message,
  }));
}

// ─── Controller ────────────────────────────────────────────────────────────

export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  // GET /categories
  getAll = async (
    request: FastifyRequest<{ Querystring: GetCategoriesQuery }>,
    reply: FastifyReply,
  ) => {
    const parsed = getCategoriesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid query parameters',
        errors: formatZodErrors(parsed.error),
      });
    }

    const { categories, meta } = await this.service.getAll(parsed.data);

    return sendSuccess({
      reply,
      message: 'Categories retrieved successfully',
      data: categories,
      meta,
    });
  };

  // GET /categories/:id
  getById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const parsed = categoryIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid category ID',
        errors: formatZodErrors(parsed.error),
      });
    }

    try {
      const category = await this.service.getById(parsed.data.id);
      return sendSuccess({
        reply,
        message: 'Category retrieved successfully',
        data: category,
      });
    } catch (err) {
      if (err instanceof CategoryNotFoundError) {
        return sendError({ reply, statusCode: 404, message: err.message });
      }
      throw err;
    }
  };

  // POST /categories
  create = async (
    request: FastifyRequest<{ Body: CreateCategoryInput }>,
    reply: FastifyReply,
  ) => {
    const parsed = createCategorySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Validation failed',
        errors: formatZodErrors(parsed.error),
      });
    }

    try {
      const category = await this.service.create(parsed.data, request.user.id);
      return sendSuccess({
        reply,
        statusCode: 201,
        message: 'Category created successfully',
        data: category,
      });
    } catch (err) {
      if (err instanceof CategoryConflictError) {
        return sendError({ reply, statusCode: 409, message: err.message });
      }
      throw err;
    }
  };

  // PATCH /categories/:id
  update = async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateCategoryInput;
    }>,
    reply: FastifyReply,
  ) => {
    const paramParsed = categoryIdParamSchema.safeParse(request.params);
    if (!paramParsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid category ID',
        errors: formatZodErrors(paramParsed.error),
      });
    }

    const bodyParsed = updateCategorySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Validation failed',
        errors: formatZodErrors(bodyParsed.error),
      });
    }

    try {
      const category = await this.service.update(
        paramParsed.data.id,
        bodyParsed.data,
        request.user.id,
      );
      return sendSuccess({
        reply,
        message: 'Category updated successfully',
        data: category,
      });
    } catch (err) {
      if (err instanceof CategoryNotFoundError) {
        return sendError({ reply, statusCode: 404, message: err.message });
      }
      if (err instanceof CategoryConflictError) {
        return sendError({ reply, statusCode: 409, message: err.message });
      }
      throw err;
    }
  };

  // DELETE /categories/:id
  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const parsed = categoryIdParamSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendError({
        reply,
        statusCode: 400,
        message: 'Invalid category ID',
        errors: formatZodErrors(parsed.error),
      });
    }

    try {
      await this.service.delete(parsed.data.id, request.user.id);
      return sendSuccess({ reply, message: 'Category deleted successfully' });
    } catch (err) {
      if (err instanceof CategoryNotFoundError) {
        return sendError({ reply, statusCode: 404, message: err.message });
      }
      if (err instanceof CategoryHasChildrenError) {
        return sendError({ reply, statusCode: 409, message: err.message });
      }
      throw err;
    }
  };
}
