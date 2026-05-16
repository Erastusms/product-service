// src/modules/product/product.service.ts

import type { ProductRepository } from './product.repository.js';
import type {
  CreateProductInput,
  UpdateProductInput,
  GetProductsQuery,
} from './product.schema.js';
import { generateSlug } from '../../utils/slug.js';

// ─── Errors ────────────────────────────────────────────────────────────────

export class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product with ID "${id}" not found`);
    this.name = 'ProductNotFoundError';
  }
}

export class ProductConflictError extends Error {
  constructor(field: string, value: string) {
    super(`A product with ${field} "${value}" already exists`);
    this.name = 'ProductConflictError';
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

export class ProductService {
  constructor(private readonly repository: ProductRepository) {}

  async getAll(query: GetProductsQuery) {
    const { products, total } = await this.repository.findAll(query);
    return {
      products,
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getById(id: string) {
    const product = await this.repository.findById(id);
    if (!product) throw new ProductNotFoundError(id);
    return product;
  }

  async create(input: CreateProductInput, userId: string) {
    const slug = generateSlug(input.name);

    const [slugConflict, skuConflict] = await Promise.all([
      this.repository.findBySlug(slug),
      input.sku ? this.repository.findBySku(input.sku) : null,
    ]);

    if (slugConflict) throw new ProductConflictError('name (slug)', slug);
    if (skuConflict) throw new ProductConflictError('SKU', input.sku!);

    return this.repository.create({ ...input, slug, createdBy: userId });
  }

  async update(id: string, input: UpdateProductInput, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new ProductNotFoundError(id);

    const slug = input.name ? generateSlug(input.name) : undefined;

    const [slugConflict, skuConflict] = await Promise.all([
      slug ? this.repository.findBySlug(slug, id) : null,
      input.sku ? this.repository.findBySku(input.sku, id) : null,
    ]);

    if (slugConflict) throw new ProductConflictError('name (slug)', slug!);
    if (skuConflict) throw new ProductConflictError('SKU', input.sku!);

    return this.repository.update(id, { ...input, ...(slug && { slug }), updatedBy: userId });
  }

  async delete(id: string, userId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) throw new ProductNotFoundError(id);
    return this.repository.softDelete(id, userId);
  }
}
