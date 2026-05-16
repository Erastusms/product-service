// src/modules/product/product.repository.ts

import type { PrismaClient } from '@prisma/client';
import type { CreateProductInput, UpdateProductInput, GetProductsQuery } from './product.schema.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FindAllOptions extends GetProductsQuery {
  includeDeleted?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WhereInput = Record<string, any>;

// ─── Repository ────────────────────────────────────────────────────────────

export class ProductRepository {
  constructor(private readonly db: PrismaClient) {}

  private get baseWhere(): WhereInput {
    return { deletedAt: null };
  }

  async findAll({ page, limit, search, isActive }: FindAllOptions) {
    const skip = (page - 1) * limit;

    const where: WhereInput = {
      ...this.baseWhere,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.db.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.product.count({ where }),
    ]);

    return { products, total };
  }

  async findById(id: string) {
    return this.db.product.findFirst({
      where: { id, ...this.baseWhere },
    });
  }

  async findBySlug(slug: string, excludeId?: string) {
    return this.db.product.findFirst({
      where: {
        slug,
        ...this.baseWhere,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
  }

  async findBySku(sku: string, excludeId?: string) {
    return this.db.product.findFirst({
      where: {
        sku,
        ...this.baseWhere,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
  }

  async create(data: CreateProductInput & { slug: string; createdBy: string }) {
    return this.db.product.create({ data });
  }

  async update(id: string, data: UpdateProductInput & { slug?: string; updatedBy: string }) {
    return this.db.product.update({ where: { id }, data });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.db.product.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    });
  }
}
