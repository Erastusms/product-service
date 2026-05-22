// src/modules/category/category.service.ts

import type { CategoryRepository } from './category.repository.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  GetCategoriesQuery,
} from './category.schema.js';
import { generateSlug } from '../../utils/slug.js';

// ─── Errors ────────────────────────────────────────────────────────────────

export class CategoryNotFoundError extends Error {
  constructor(id: string) {
    super(`Category with ID "${id}" not found`);
    this.name = 'CategoryNotFoundError';
  }
}

export class CategoryConflictError extends Error {
  constructor(field: string, value: string) {
    super(`A category with ${field} "${value}" already exists`);
    this.name = 'CategoryConflictError';
  }
}

export class CategoryHasChildrenError extends Error {
  constructor(id: string) {
    super(`Category "${id}" cannot be deleted because it has child categories`);
    this.name = 'CategoryHasChildrenError';
  }
}

// ─── Pagination Meta ───────────────────────────────────────────────────────

function buildPaginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}

// ─── Service ───────────────────────────────────────────────────────────────

export class CategoryService {
  constructor(private readonly repository: CategoryRepository) {}

  async getAll(query: GetCategoriesQuery) {
    const { categories, total } = await this.repository.findAll(query);
    return {
      categories,
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getById(id: string) {
    const category = await this.repository.findById(id);
    if (!category) throw new CategoryNotFoundError(id);
    return category;
  }

  async create(input: CreateCategoryInput, userId: string) {
    const slug = generateSlug(input.name);

    const slugConflict = await this.repository.findBySlug(slug);
    if (slugConflict) throw new CategoryConflictError('name (slug)', slug);

    return this.repository.create({ ...input, slug, createdBy: userId });
  }

  async update(id: string, input: UpdateCategoryInput, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);

    // Prevent a category from being its own parent
    if (input.parentId === id) {
      throw new CategoryConflictError('parentId', id);
    }

    const slug = input.name ? generateSlug(input.name) : undefined;

    const slugConflict = slug
      ? await this.repository.findBySlug(slug, id)
      : null;
    if (slugConflict) throw new CategoryConflictError('name (slug)', slug!);

    return this.repository.update(id, {
      ...input,
      ...(slug && { slug }),
      updatedBy: userId,
    });
  }

  async delete(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new CategoryNotFoundError(id);

    const hasChildren = await this.repository.hasChildren(id);
    if (hasChildren) throw new CategoryHasChildrenError(id);

    return this.repository.softDelete(id, userId);
  }
}
