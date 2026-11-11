import { describe, expect, it } from 'vitest';
import { JobSchema, ProfileSchema, RubricSchema } from '../src/core/index.js';
import { loadRubric } from './helpers.js';

describe('RubricSchema', () => {
  it('aceita a rubrica padrão', () => {
    expect(() => loadRubric()).not.toThrow();
  });

  it('rejeita ids repetidos', () => {
    const rubric = loadRubric();
    const repeated = { ...rubric, criteria: [...rubric.criteria, { ...rubric.criteria[0] }] };
    const result = RubricSchema.safeParse(repeated);
    expect(result.success).toBe(false);
  });

  it('rejeita peso zero ou negativo', () => {
    const rubric = loadRubric();
    const [first, ...rest] = rubric.criteria;
    const broken = { ...rubric, criteria: [{ ...first, weight: 0 }, ...rest] };
    expect(RubricSchema.safeParse(broken).success).toBe(false);
  });

  it('rejeita campo desconhecido', () => {
    expect(RubricSchema.safeParse({ ...loadRubric(), extra: true }).success).toBe(false);
  });
});

describe('ProfileSchema e JobSchema', () => {
  it('rejeitam senioridade desconhecida', () => {
    expect(ProfileSchema.safeParse({ skills: [], seniority: 'guru', modalities: ['remote'], languages: [] }).success).toBe(false);
    expect(
      JobSchema.safeParse({
        title: 'x',
        description: '',
        required: [],
        desired: [],
        seniority: 'guru',
        modality: 'remote',
        languages: [],
      }).success,
    ).toBe(false);
  });

  it('rejeitam descrição acima do limite', () => {
    const result = JobSchema.safeParse({
      title: 'x',
      description: 'a'.repeat(20001),
      required: [],
      desired: [],
      seniority: 'senior',
      modality: 'remote',
      languages: [],
    });
    expect(result.success).toBe(false);
  });
});
