// src/modules/product/product.schema.ts

import { z } from 'zod';

// ─── Request Schemas ───────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0).default(0),
  sku: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().max(100).optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const getProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
});

// ─── Inferred Types ────────────────────────────────────────────────────────

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type GetProductsQuery = z.infer<typeof getProductsQuerySchema>;
export type ProductIdParam = z.infer<typeof productIdParamSchema>;
