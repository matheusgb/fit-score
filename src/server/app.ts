import { existsSync } from 'node:fs';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import { z } from 'zod';
import { JobSchema, ProfileSchema, scoreFit, type Rubric } from '../core/index.js';
import type { Examples } from './data.js';

export interface AppOptions {
  rubric: Rubric;
  examples: Examples;
  /** Pasta do front-end compilado. Quando ausente ou inexistente, só a API responde. */
  webDir?: string;
  logger?: boolean;
}

const ScoreRequestSchema = z.object({ profile: ProfileSchema, job: JobSchema }).strict();

export function buildApp(options: AppOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 100 * 1024 });

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.get('/api/rubric', async () => options.rubric);

  app.get('/api/examples', async () => options.examples);

  app.post('/api/score', async (request, reply) => {
    const parsed = ScoreRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'invalid_request',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return scoreFit(parsed.data.profile, parsed.data.job, options.rubric);
  });

  if (options.webDir !== undefined && existsSync(options.webDir)) {
    void app.register(fastifyStatic, { root: options.webDir });
  }

  return app;
}
