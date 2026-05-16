// src/app.ts

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { env } from './config/env.js';
import prismaPlugin from './plugins/prisma.js';
import { productRoutes } from './modules/product/product.routes.js';

async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Global Plugins ────────────────────────────────────────────────
  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Database Plugin ───────────────────────────────────────────────
  await app.register(prismaPlugin);

  // ─── Routes ───────────────────────────────────────────────────────
  await app.register(productRoutes, { prefix: '/v1/products' });

  // ─── Health Check ─────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    service: 'product-service',
    timestamp: new Date().toISOString(),
  }));

  // ─── Global Error Handler ──────────────────────────────────────────
  app.setErrorHandler(async (error, _request, reply) => {
    app.log.error(error);
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  });

  return app;
}

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`🚀 product-service running on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
