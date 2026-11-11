import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { JobSchema, ProfileSchema, RubricSchema, type Job, type Profile, type Rubric } from '../core/index.js';

export interface Examples {
  profile: Profile;
  jobs: { id: string; job: Job }[];
}

export function loadRubric(path: string): Rubric {
  return RubricSchema.parse(parse(readFileSync(path, 'utf8')));
}

/**
 * Lê fixtures/profile.example.json e fixtures/job-*.example.json.
 * Valida tudo na partida: dado de exemplo inválido derruba o servidor em vez de aparecer na tela.
 */
export function loadExamples(dir: string): Examples {
  const profile = ProfileSchema.parse(JSON.parse(readFileSync(join(dir, 'profile.example.json'), 'utf8')));
  const jobs = readdirSync(dir)
    .filter((file) => /^job-.+\.example\.json$/.test(file))
    .sort()
    .map((file) => ({
      id: file.replace(/^job-/, '').replace(/\.example\.json$/, ''),
      job: JobSchema.parse(JSON.parse(readFileSync(join(dir, file), 'utf8'))),
    }));
  return { profile, jobs };
}
