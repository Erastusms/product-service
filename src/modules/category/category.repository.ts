// src/modules/category/category.repository.ts

import type { PrismaClient } from '@prisma/client';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  GetCategoriesQuery,
} from './category.schema.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FindAllCategoriesOptions extends GetCategoriesQuery {
  includeDeleted?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WhereInput = Record<string, any>;

// ─── Repository ────────────────────────────────────────────────────────────

export class CategoryRepository {
  constructor(private readonly db: PrismaClient) {}

  private get baseWhere(): WhereInput {
    return { deletedAt: null };
  }

  async findAll({
    page,
    limit,
    search,
    parentId,
    isActive,
  }: FindAllCategoriesOptions) {
    const skip = (page - 1) * limit;

    const where: WhereInput = {
      ...this.baseWhere,
      ...(isActive !== undefined && { isActive }),
      // parentId: undefined → no filter; null → root only; uuid → children of that parent
      ...(parentId !== undefined && { parentId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [categories, total] = await Promise.all([
      this.db.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: {
          parent: { select: { id: true, name: true, slug: true } },
          _count: { select: { children: true, products: true } },
        },
      }),
      this.db.category.count({ where }),
    ]);

    return { categories, total };
  }

  async findById(id: string) {
    return this.db.category.findFirst({
      where: { id, ...this.baseWhere },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            slug: true,
            order: true,
            isActive: true,
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async findBySlug(slug: string, excludeId?: string) {
    return this.db.category.findFirst({
      where: {
        slug,
        ...this.baseWhere,
        ...(excludeId && { NOT: { id: excludeId } }),
      },
    });
  }

  async create(
    data: CreateCategoryInput & { slug: string; createdBy: string },
  ) {
    return this.db.category.create({
      data,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(
    id: string,
    data: UpdateCategoryInput & { slug?: string; updatedBy: string },
  ) {
    return this.db.category.update({
      where: { id },
      data,
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { children: true, products: true } },
      },
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.db.category.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: deletedBy },
    });
  }

  /** Check if any non-deleted children exist (used before delete). */
  async hasChildren(id: string): Promise<boolean> {
    const count = await this.db.category.count({
      where: { parentId: id, deletedAt: null },
    });
    return count > 0;
  }
}
