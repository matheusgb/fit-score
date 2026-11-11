import { describe, expect, it } from 'vitest';
import { scoreFit, type CriterionResult } from '../src/core/index.js';
import { baseJob, baseProfile, loadJob, loadProfile, loadRubric } from './helpers.js';

const rubric = loadRubric();

function criterion(result: ReturnType<typeof scoreFit>, id: string): CriterionResult {
  const found = result.criteria.find((item) => item.id === id);
  if (found === undefined) throw new Error(`critério ausente: ${id}`);
  return found;
}

describe('scoreFit com os exemplos sintéticos', () => {
  const profile = loadProfile();

  it('vaga fullstack: 87 (requisitos completos, 1 de 3 diferenciais)', () => {
    const result = scoreFit(profile, loadJob('fullstack'), rubric);
    expect(result.total).toBe(87);
    expect(result.maxPoints).toBe(100);
    expect(result.earnedPoints).toBeCloseTo(86.667, 3);
    expect(criterion(result, 'required-skills').ratio).toBe(1);
    expect(criterion(result, 'desired-skills').items.map((item) => [item.name, item.met])).toEqual([
      ['Docker', true],
      ['Kubernetes', false],
      ['GraphQL', false],
    ]);
  });

  it('vaga backend em Go: 67 (faltam Go e Kafka)', () => {
    const result = scoreFit(profile, loadJob('backend-go'), rubric);
    expect(result.total).toBe(67);
    const required = criterion(result, 'required-skills');
    expect(required.items.filter((item) => !item.met).map((item) => item.name)).toEqual(['Go', 'Kafka']);
  });

  it('vaga front presencial: 34, nível abaixo vale metade e idiomas ficam fora da nota', () => {
    const result = scoreFit(profile, loadJob('front-presencial'), rubric);
    expect(result.total).toBe(34);
    expect(result.maxPoints).toBe(95);
    expect(criterion(result, 'seniority').points).toBe(7.5);
    expect(criterion(result, 'modality').points).toBe(0);
    expect(criterion(result, 'languages').applicable).toBe(false);
  });

  it('cada item traz o trecho da vaga que o cita', () => {
    const result = scoreFit(profile, loadJob('fullstack'), rubric);
    const node = criterion(result, 'required-skills').items.find((item) => item.name === 'Node.js');
    expect(node?.evidence).toBe('A API roda em Node.js sobre PostgreSQL.');
  });

  it('é determinístico: duas chamadas dão o mesmo resultado', () => {
    const job = loadJob('fullstack');
    expect(scoreFit(profile, job, rubric)).toEqual(scoreFit(profile, job, rubric));
  });
});

describe('scoreFit: regras por critério', () => {
  it('usa equivalências da rubrica (ts = typescript, k8s = kubernetes)', () => {
    const result = scoreFit(
      baseProfile({ skills: ['TS', 'k8s'] }),
      baseJob({ required: ['TypeScript', 'Kubernetes'] }),
      rubric,
    );
    expect(criterion(result, 'required-skills').ratio).toBe(1);
  });

  it('não conta duas vezes o mesmo item escrito de formas diferentes', () => {
    const result = scoreFit(baseProfile(), baseJob({ required: ['TypeScript', 'ts'] }), rubric);
    expect(criterion(result, 'required-skills').items).toHaveLength(1);
  });

  it('grupo vazio sai da nota em vez de valer zero', () => {
    const result = scoreFit(baseProfile(), baseJob({ desired: [] }), rubric);
    expect(criterion(result, 'desired-skills').applicable).toBe(false);
    expect(result.maxPoints).toBe(100 - 20 - 50 - 5);
  });

  it('sem nenhum critério aplicável a nota é 0', () => {
    const onlySkills = { ...rubric, criteria: rubric.criteria.filter((item) => item.kind === 'desired-skills') };
    expect(scoreFit(baseProfile(), baseJob(), onlySkills).total).toBe(0);
  });

  it.each([
    ['senior', 'senior', 15],
    ['staff', 'senior', 15],
    ['mid', 'senior', 7.5],
    ['junior', 'senior', 0],
  ] as const)('senioridade: perfil %s para vaga %s vale %s pontos', (have, want, points) => {
    const result = scoreFit(baseProfile({ seniority: have }), baseJob({ seniority: want }), rubric);
    expect(criterion(result, 'seniority').points).toBe(points);
  });

  it('respeita partialBelowOne definido na rubrica', () => {
    const custom = {
      ...rubric,
      criteria: rubric.criteria.map((item) => (item.kind === 'seniority' ? { ...item, partialBelowOne: 0.2 } : item)),
    };
    const result = scoreFit(baseProfile({ seniority: 'mid' }), baseJob({ seniority: 'senior' }), custom);
    expect(criterion(result, 'seniority').points).toBeCloseTo(3, 10);
  });
});

describe('scoreFit: propriedades', () => {
  const profile = loadProfile();
  const job = loadJob('fullstack');

  it('acrescentar uma habilidade ao perfil nunca reduz a nota', () => {
    const base = scoreFit(profile, job, rubric).total;
    for (const extra of ['Kubernetes', 'GraphQL', 'Rust', 'Docker']) {
      const withExtra = scoreFit({ ...profile, skills: [...profile.skills, extra] }, job, rubric).total;
      expect(withExtra).toBeGreaterThanOrEqual(base);
    }
  });

  it('subir a senioridade do perfil nunca reduz a nota', () => {
    const order = ['junior', 'mid', 'senior', 'staff'] as const;
    const totals = order.map((seniority) => scoreFit({ ...profile, seniority }, job, rubric).total);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
  });

  it('a nota fica sempre entre 0 e 100', () => {
    for (const name of ['fullstack', 'backend-go', 'front-presencial'] as const) {
      const { total } = scoreFit(profile, loadJob(name), rubric);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(100);
    }
  });
});
