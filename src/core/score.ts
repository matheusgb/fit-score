import { AliasResolver } from './aliases.js';
import {
  SENIORITY_LEVELS,
  type Criterion,
  type CriterionResult,
  type ItemResult,
  type Job,
  type Profile,
  type Rubric,
  type ScoreResult,
} from './schema.js';
import { findEvidence, normalize } from './text.js';

/** Nível abaixo do pedido pontua esta fração quando a rubrica não define `partialBelowOne`. */
const DEFAULT_PARTIAL_BELOW_ONE = 0.5;

function notApplicable(criterion: Criterion, reason: string): CriterionResult {
  return {
    id: criterion.id,
    label: criterion.label,
    kind: criterion.kind,
    weight: criterion.weight,
    applicable: false,
    ratio: 0,
    points: 0,
    reason,
    items: [],
  };
}

function withRatio(
  criterion: Criterion,
  ratio: number,
  reason: string,
  items: ItemResult[] = [],
): CriterionResult {
  return {
    id: criterion.id,
    label: criterion.label,
    kind: criterion.kind,
    weight: criterion.weight,
    applicable: true,
    ratio,
    points: criterion.weight * ratio,
    reason,
    items,
  };
}

function uniqueByCanonical(names: string[], resolver: AliasResolver): string[] {
  const seen = new Set<string>();
  return names.filter((name) => {
    const key = resolver.canonical(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreSkills(
  criterion: Criterion,
  wanted: string[],
  profile: Profile,
  job: Job,
  resolver: AliasResolver,
): CriterionResult {
  const names = uniqueByCanonical(wanted, resolver);
  if (names.length === 0) {
    return notApplicable(criterion, 'A vaga não lista itens neste grupo; o critério não entra na nota.');
  }
  const owned = new Set(profile.skills.map((skill) => resolver.canonical(skill)));
  const items: ItemResult[] = names.map((name) => {
    const evidence = findEvidence(job.description, resolver.variants(name));
    return {
      name,
      met: owned.has(resolver.canonical(name)),
      ...(evidence === undefined ? {} : { evidence }),
    };
  });
  const met = items.filter((item) => item.met).length;
  return withRatio(criterion, met / items.length, `${met} de ${items.length} itens atendidos pelo perfil.`, items);
}

function scoreSeniority(criterion: Criterion, profile: Profile, job: Job): CriterionResult {
  const have = SENIORITY_LEVELS.indexOf(profile.seniority);
  const want = SENIORITY_LEVELS.indexOf(job.seniority);
  const partial = criterion.partialBelowOne ?? DEFAULT_PARTIAL_BELOW_ONE;
  if (have >= want) {
    return withRatio(criterion, 1, `Perfil (${profile.seniority}) atende o nível pedido (${job.seniority}).`);
  }
  if (want - have === 1) {
    return withRatio(
      criterion,
      partial,
      `Perfil (${profile.seniority}) está um nível abaixo do pedido (${job.seniority}): pontuação parcial de ${partial}.`,
    );
  }
  return withRatio(
    criterion,
    0,
    `Perfil (${profile.seniority}) está mais de um nível abaixo do pedido (${job.seniority}).`,
  );
}

function scoreModality(criterion: Criterion, profile: Profile, job: Job): CriterionResult {
  const accepted = profile.modalities.includes(job.modality);
  return withRatio(
    criterion,
    accepted ? 1 : 0,
    accepted
      ? `A modalidade da vaga (${job.modality}) está entre as aceitas pelo perfil.`
      : `A modalidade da vaga (${job.modality}) não está entre as aceitas pelo perfil (${profile.modalities.join(', ')}).`,
  );
}

function scoreLanguages(criterion: Criterion, profile: Profile, job: Job): CriterionResult {
  const seen = new Set<string>();
  const wanted = job.languages.filter((name) => {
    const key = normalize(name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (wanted.length === 0) {
    return notApplicable(criterion, 'A vaga não lista idiomas; o critério não entra na nota.');
  }
  const owned = new Set(profile.languages.map(normalize));
  const items: ItemResult[] = wanted.map((name) => {
    const evidence = findEvidence(job.description, [name]);
    return { name, met: owned.has(normalize(name)), ...(evidence === undefined ? {} : { evidence }) };
  });
  const met = items.filter((item) => item.met).length;
  return withRatio(criterion, met / items.length, `Idiomas atendidos pelo perfil: ${met} de ${items.length}.`, items);
}

function scoreCriterion(
  criterion: Criterion,
  profile: Profile,
  job: Job,
  resolver: AliasResolver,
): CriterionResult {
  switch (criterion.kind) {
    case 'required-skills':
      return scoreSkills(criterion, job.required, profile, job, resolver);
    case 'desired-skills':
      return scoreSkills(criterion, job.desired, profile, job, resolver);
    case 'seniority':
      return scoreSeniority(criterion, profile, job);
    case 'modality':
      return scoreModality(criterion, profile, job);
    case 'languages':
      return scoreLanguages(criterion, profile, job);
  }
}

/**
 * Função pura: a mesma entrada dá sempre o mesmo resultado, sem rede, sem aleatoriedade e sem modelo de linguagem.
 * A nota é (pontos obtidos / pontos possíveis dos critérios aplicáveis) × 100, arredondada para inteiro.
 */
export function scoreFit(profile: Profile, job: Job, rubric: Rubric): ScoreResult {
  const resolver = new AliasResolver(rubric.aliases);
  const criteria = rubric.criteria.map((criterion) => scoreCriterion(criterion, profile, job, resolver));
  const applicable = criteria.filter((result) => result.applicable);
  const maxPoints = applicable.reduce((sum, result) => sum + result.weight, 0);
  const earnedPoints = applicable.reduce((sum, result) => sum + result.points, 0);
  const total = maxPoints === 0 ? 0 : Math.round((earnedPoints / maxPoints) * 100);
  return { rubricVersion: rubric.version, total, earnedPoints, maxPoints, criteria };
}
