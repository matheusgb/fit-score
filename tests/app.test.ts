import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server/app.js';
import { loadExamples, loadRubric } from '../src/server/data.js';
import { loadJob, loadProfile } from './helpers.js';

const rubric = loadRubric(new URL('../rubric/default.yaml', import.meta.url).pathname);
const examples = loadExamples(new URL('../fixtures', import.meta.url).pathname);

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp({ rubric, examples });
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET', () => {
  it('/api/health responde ok', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('/api/rubric devolve a rubrica carregada, com todos os critérios', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/rubric' });
    expect(response.json().criteria.map((item: { id: string }) => item.id)).toEqual([
      'required-skills',
      'desired-skills',
      'seniority',
      'modality',
      'languages',
    ]);
  });

  it('/api/examples devolve o perfil e as 3 vagas sintéticas', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/examples' });
    const body = response.json();
    expect(body.jobs.map((item: { id: string }) => item.id)).toEqual(['backend-go', 'front-presencial', 'fullstack']);
    expect(body.profile.note).toContain('EXEMPLO SINTÉTICO');
    for (const item of body.jobs) expect(item.job.note).toContain('EXEMPLO SINTÉTICO');
  });
});

describe('POST /api/score', () => {
  it('pontua um perfil e uma vaga válidos', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: { profile: loadProfile(), job: loadJob('fullstack') },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(87);
    expect(body.criteria).toHaveLength(5);
  });

  it('devolve 400 com o caminho do campo inválido', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: { profile: { ...loadProfile(), seniority: 'guru' }, job: loadJob('fullstack') },
    });
    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error).toBe('invalid_request');
    expect(body.issues[0].path).toBe('profile.seniority');
  });

  it('devolve 400 quando o corpo traz campos extras', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: { profile: loadProfile(), job: loadJob('fullstack'), rubric: {} },
    });
    expect(response.statusCode).toBe(400);
  });

  it('devolve 400 sem corpo', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/score' });
    expect(response.statusCode).toBe(400);
  });
});
