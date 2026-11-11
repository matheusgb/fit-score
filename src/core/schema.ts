import { z } from 'zod';

export const SENIORITY_LEVELS = ['junior', 'mid', 'senior', 'staff'] as const;
export const MODALITIES = ['remote', 'hybrid', 'onsite'] as const;
export const CRITERION_KINDS = [
  'required-skills',
  'desired-skills',
  'seniority',
  'modality',
  'languages',
] as const;

const name = z.string().trim().min(1).max(80);
const nameList = z.array(name).max(100);
const note = z.string().max(300).optional();

export const ProfileSchema = z
  .object({
    skills: nameList,
    seniority: z.enum(SENIORITY_LEVELS),
    modalities: z.array(z.enum(MODALITIES)).min(1),
    languages: nameList,
    note,
  })
  .strict();

export const JobSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    company: z.string().trim().max(120).optional(),
    description: z.string().max(20000),
    required: nameList,
    desired: nameList,
    seniority: z.enum(SENIORITY_LEVELS),
    modality: z.enum(MODALITIES),
    languages: nameList,
    note,
  })
  .strict();

export const CriterionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'use letras minúsculas, números e hífen'),
    kind: z.enum(CRITERION_KINDS),
    label: z.string().trim().min(1).max(120),
    weight: z.number().positive().max(1000),
    // Só vale para kind "seniority": fração dos pontos quando o perfil está um nível abaixo da vaga.
    partialBelowOne: z.number().min(0).max(1).optional(),
  })
  .strict();

export const RubricSchema = z
  .object({
    version: z.number().int().positive(),
    aliases: z.record(name, z.array(name).max(20)).default({}),
    criteria: z.array(CriterionSchema).min(1).max(20),
  })
  .strict()
  .superRefine((rubric, ctx) => {
    const seen = new Set<string>();
    rubric.criteria.forEach((criterion, index) => {
      if (seen.has(criterion.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['criteria', index, 'id'],
          message: `id repetido: ${criterion.id}`,
        });
      }
      seen.add(criterion.id);
    });
  });

export type Seniority = (typeof SENIORITY_LEVELS)[number];
export type Modality = (typeof MODALITIES)[number];
export type CriterionKind = (typeof CRITERION_KINDS)[number];
export type Profile = z.infer<typeof ProfileSchema>;
export type Job = z.infer<typeof JobSchema>;
export type Criterion = z.infer<typeof CriterionSchema>;
export type Rubric = z.infer<typeof RubricSchema>;

export interface ItemResult {
  name: string;
  met: boolean;
  /** Trecho da descrição da vaga que cita o item. Ausente quando a descrição não o cita. */
  evidence?: string;
}

export interface CriterionResult {
  id: string;
  label: string;
  kind: CriterionKind;
  weight: number;
  /** false quando a vaga não traz dados para o critério; ele sai do denominador da nota. */
  applicable: boolean;
  ratio: number;
  points: number;
  reason: string;
  items: ItemResult[];
}

export interface ScoreResult {
  rubricVersion: number;
  /** Nota de 0 a 100: pontos obtidos sobre pontos possíveis dos critérios aplicáveis, arredondada. */
  total: number;
  earnedPoints: number;
  maxPoints: number;
  criteria: CriterionResult[];
}
